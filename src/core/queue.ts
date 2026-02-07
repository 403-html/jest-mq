export type MessagePayload = Record<string, unknown> & {
  type?: string;
};

export type DeliveryMode = "broadcast" | "competing";

export type Message<T extends MessagePayload = MessagePayload> = Omit<
  T,
  "type" | "id" | "attempts" | "redelivered"
> & {
  type: string | undefined;
  id: number;
  attempts: number;
  redelivered: boolean;
};

export type MessageHandler<T extends MessagePayload = MessagePayload> = (
  message: Message<T>,
) => Promise<void> | void;

export type QueueOptions = {
  deliveryMode?: DeliveryMode;
  failFast?: boolean;
  captureErrors?: boolean;
};

export type ConsumeOptions = {
  prefetch?: number;
  autoAck?: boolean;
};

export type ConsumerStats = {
  inFlight: number;
  delivered: number;
  acked: number;
  nacked: number;
};

export type ConsumerControl = {
  stop: (options?: { requeueInFlight?: boolean }) => void;
  stats: () => ConsumerStats;
};

export type FlushOptions = {
  failFast?: boolean;
  captureErrors?: boolean;
};

type InFlightRecord<T extends MessagePayload> = {
  message: Message<T>;
  consumerId?: number;
};

type Consumer<T extends MessagePayload> = {
  id: number;
  messageType: string | undefined;
  handler: MessageHandler<T>;
  prefetch: number;
  autoAck: boolean;
  inFlight: Message<T>[];
  delivered: number;
  acked: number;
  nacked: number;
  stopped: boolean;
};

type QueueSnapshot<T extends MessagePayload> = {
  name: string;
  sentMessages: Message<T>[];
  inFlightMessages: Message<T>[];
  receivedMessages: Message<T>[];
  handlers: Map<string | undefined, MessageHandler<T>[]>;
};

type QueueLive<T extends MessagePayload> = {
  name: string;
  sentMessages: Message<T>[];
  inFlightMessages: Message<T>[];
  receivedMessages: Message<T>[];
  handlers: Consumer<T>[];
};

export class MessageQueue<T extends MessagePayload = MessagePayload> {
  private sentMessages: Message<T>[] = [];
  private inFlightRecords: InFlightRecord<T>[] = [];
  private receivedMessages: Message<T>[] = [];
  private consumers: Consumer<T>[] = [];
  private messageCount = 0;
  private consumerCount = 0;
  private deliveryMode: DeliveryMode;
  private failFast: boolean;
  private captureErrors: boolean;
  private nextConsumerIndex = new Map<string | undefined, number>();

  constructor(
    public name: string,
    options: QueueOptions = {},
  ) {
    if (!name) {
      throw new Error("Queue name is required");
    }
    if (name.length > 255) {
      throw new Error("Queue name is too long");
    }
    if (name.includes(" ")) {
      throw new Error("Queue name cannot contain spaces");
    }
    this.deliveryMode = options.deliveryMode ?? "broadcast";
    this.failFast = options.failFast ?? false;
    this.captureErrors = options.captureErrors ?? true;
  }

  /**
   * Returns a snapshot of the queue by default. Pass `false` to access live
   * references for read-only inspection without cloning.
   */
  getQueue(snapshot?: true): QueueSnapshot<T>;
  getQueue(snapshot: false): QueueLive<T>;
  getQueue(snapshot = true): QueueSnapshot<T> | QueueLive<T> {
    if (!snapshot) {
      return {
        name: this.name,
        sentMessages: this.sentMessages,
        inFlightMessages: this.inFlightRecords.map((record) => record.message),
        receivedMessages: this.receivedMessages,
        handlers: this.consumers,
      };
    }

    return {
      name: this.name,
      sentMessages: [...this.sentMessages],
      inFlightMessages: this.inFlightRecords.map((record) => record.message),
      receivedMessages: [...this.receivedMessages],
      handlers: this.buildHandlerMap(),
    };
  }

  clear(): void {
    this.sentMessages = [];
    this.inFlightRecords = [];
    this.receivedMessages = [];
    this.consumers = [];
    this.messageCount = 0;
    this.consumerCount = 0;
    this.nextConsumerIndex.clear();
  }

  publish(message: T): number {
    const messageWithId: Message<T> = {
      ...message,
      type: message.type,
      id: this.messageCount++,
      attempts: 0,
      redelivered: false,
    };
    this.sentMessages.push(messageWithId);
    return messageWithId.id;
  }

  receiveMessage(messageType?: string, autoAck = true): Message<T> | undefined {
    const messageIndex = messageType
      ? this.sentMessages.findIndex((m) => m.type === messageType)
      : this.sentMessages.length > 0
        ? 0
        : -1;
    if (messageIndex === -1) {
      return undefined;
    }

    const [message] = this.sentMessages.splice(messageIndex, 1);

    if (autoAck) {
      this.receivedMessages.push(message);
    } else {
      this.inFlightRecords.push({ message });
    }

    return message;
  }

  ack(message: Message<T>): void {
    this.ackWithConsumer(message);
  }

  nack(message: Message<T>): void {
    this.nackWithConsumer(message);
  }

  subscribe(
    messageType: string | undefined,
    handler: MessageHandler<T>,
  ): () => void {
    const consumer = this.createConsumer(messageType, handler, {
      prefetch: Number.POSITIVE_INFINITY,
      autoAck: true,
    });

    return () => this.stopConsumer(consumer, false);
  }

  consume(
    messageType: string | undefined,
    handler: MessageHandler<T>,
    options: ConsumeOptions = {},
  ): ConsumerControl {
    const consumer = this.createConsumer(messageType, handler, options);

    return {
      stop: (stopOptions) =>
        this.stopConsumer(consumer, stopOptions?.requeueInFlight ?? true),
      stats: () => ({
        inFlight: consumer.inFlight.length,
        delivered: consumer.delivered,
        acked: consumer.acked,
        nacked: consumer.nacked,
      }),
    };
  }

  peekReady(messageType?: string): Message<T> | undefined {
    if (messageType) {
      return this.sentMessages.find((message) => message.type === messageType);
    }
    return this.sentMessages[0];
  }

  peekAllReady(messageType?: string): Message<T>[] {
    if (!messageType) {
      return [...this.sentMessages];
    }
    return this.sentMessages.filter((message) => message.type === messageType);
  }

  readyCount(): number {
    return this.sentMessages.length;
  }

  inFlightCount(): number {
    return this.inFlightRecords.length;
  }

  ackedCount(): number {
    return this.receivedMessages.length;
  }

  waitFor(
    predicate: () => boolean,
    { timeoutMs = 3000 }: { timeoutMs?: number } = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const intervalId = setInterval(() => {
        if (predicate()) {
          clearInterval(intervalId);
          resolve();
          return;
        }
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(intervalId);
          reject(
            new Error(`Timeout waiting for condition after ${timeoutMs}ms`),
          );
        }
      }, 10);
    });
  }

  async flush(options: FlushOptions = {}): Promise<void> {
    const errors: Error[] = [];
    const failFast = options.failFast ?? this.failFast;
    const captureErrors = options.captureErrors ?? this.captureErrors;
    let stopDispatch = false;
    const pendingHandlers = new Set<Promise<void>>();

    const recordError = (error: unknown) => {
      const normalized = error instanceof Error ? error : new Error(String(error));
      errors.push(normalized);
      if (failFast || !captureErrors) {
        stopDispatch = true;
      }
    };

    const runHandler = (consumer: Consumer<T>, message: Message<T>) => {
      const processing = Promise.resolve()
        .then(() => consumer.handler(message))
        .catch((error) => {
          recordError(error);
        })
        .finally(() => {
          if (consumer.autoAck) {
            this.ackWithConsumer(message, consumer.id);
          }
          pendingHandlers.delete(processing);
        });

      pendingHandlers.add(processing);
    };

    const dispatchAvailable = (): boolean => {
      let dispatched = false;
      for (let index = 0; index < this.sentMessages.length; ) {
        if (stopDispatch) {
          break;
        }
        const message = this.sentMessages[index];
        const matchingConsumers = this.getConsumersForMessage(message);

        if (matchingConsumers.length === 0) {
          index += 1;
          continue;
        }

        if (this.deliveryMode === "broadcast") {
          const canDeliver = matchingConsumers.every(
            (consumer) => consumer.inFlight.length < consumer.prefetch,
          );
          if (!canDeliver) {
            index += 1;
            continue;
          }

          this.sentMessages.splice(index, 1);
          dispatched = true;
          for (const consumer of matchingConsumers) {
            this.addInFlight(message, consumer.id);
            consumer.delivered += 1;
            runHandler(consumer, message);
          }
          if (failFast) {
            break;
          }
          continue;
        }

        const selected = this.selectCompetingConsumer(
          matchingConsumers,
          message.type,
        );
        if (!selected) {
          index += 1;
          continue;
        }

        this.sentMessages.splice(index, 1);
        dispatched = true;
        this.addInFlight(message, selected.id);
        selected.delivered += 1;
        runHandler(selected, message);
        if (failFast) {
          break;
        }
      }
      return dispatched;
    };

    let keepDispatching = true;
    while (keepDispatching) {
      const dispatched = dispatchAvailable();
      if (stopDispatch) {
        break;
      }
      if (dispatched && failFast && pendingHandlers.size > 0) {
        await Promise.all(Array.from(pendingHandlers));
        if (stopDispatch) {
          break;
        }
        continue;
      }
      if (!dispatched) {
        if (pendingHandlers.size === 0) {
          keepDispatching = false;
          continue;
        }
        await Promise.race(pendingHandlers);
      }
    }

    await Promise.all(Array.from(pendingHandlers));

    if (errors.length > 0) {
      if (captureErrors) {
        throw new AggregateError(errors, "One or more message handlers failed");
      }
      throw errors[0];
    }
  }

  async drain(options: FlushOptions = {}): Promise<void> {
    await this.flush(options);
  }

  private createConsumer(
    messageType: string | undefined,
    handler: MessageHandler<T>,
    options: ConsumeOptions,
  ): Consumer<T> {
    const prefetch = options.prefetch ?? 1;
    if (prefetch <= 0) {
      throw new Error(`Prefetch must be greater than 0, got ${prefetch}`);
    }
    const consumer: Consumer<T> = {
      id: this.consumerCount++,
      messageType,
      handler,
      prefetch,
      autoAck: options.autoAck ?? true,
      inFlight: [],
      delivered: 0,
      acked: 0,
      nacked: 0,
      stopped: false,
    };

    this.consumers.push(consumer);
    return consumer;
  }

  private stopConsumer(consumer: Consumer<T>, requeueInFlight: boolean): void {
    consumer.stopped = true;
    this.consumers = this.consumers.filter((item) => item !== consumer);
    if (requeueInFlight) {
      for (const message of consumer.inFlight) {
        this.requeue(message);
      }
    }
    if (consumer.inFlight.length > 0) {
      this.inFlightRecords = this.inFlightRecords.filter(
        (record) => record.consumerId !== consumer.id,
      );
      consumer.inFlight = [];
    }
  }

  private buildHandlerMap(): Map<string | undefined, MessageHandler<T>[]> {
    const map = new Map<string | undefined, MessageHandler<T>[]>();
    for (const consumer of this.consumers) {
      const handlers = map.get(consumer.messageType) ?? [];
      handlers.push(consumer.handler);
      map.set(consumer.messageType, handlers);
    }
    return map;
  }

  private getConsumersForMessage(message: Message<T>): Consumer<T>[] {
    return this.consumers.filter((consumer) => {
      if (consumer.stopped) {
        return false;
      }
      if (message.type === undefined) {
        return consumer.messageType === undefined;
      }
      return (
        consumer.messageType === message.type || consumer.messageType === undefined
      );
    });
  }

  private selectCompetingConsumer(
    consumers: Consumer<T>[],
    messageType: string | undefined,
  ): Consumer<T> | undefined {
    const available = consumers.filter(
      (consumer) => consumer.inFlight.length < consumer.prefetch,
    );
    if (available.length === 0) {
      return undefined;
    }
    const key = messageType;
    const nextIndex = this.nextConsumerIndex.get(key) ?? 0;
    const selected = available[nextIndex % available.length];
    this.nextConsumerIndex.set(key, nextIndex + 1);
    return selected;
  }

  private addInFlight(message: Message<T>, consumerId?: number): void {
    const record: InFlightRecord<T> = { message, consumerId };
    this.inFlightRecords.push(record);
    if (consumerId === undefined) {
      return;
    }
    const consumer = this.consumers.find((item) => item.id === consumerId);
    if (consumer) {
      consumer.inFlight.push(message);
    }
  }

  private ackWithConsumer(message: Message<T>, consumerId?: number): void {
    const recordIndex = this.findInFlightIndex(message, consumerId);
    if (recordIndex === -1) {
      return;
    }
    const [record] = this.inFlightRecords.splice(recordIndex, 1);
    const consumer = this.removeFromConsumer(record);
    if (consumer) {
      consumer.acked += 1;
    }
    this.receivedMessages.push(record.message);
  }

  private nackWithConsumer(message: Message<T>, consumerId?: number): void {
    const recordIndex = this.findInFlightIndex(message, consumerId);
    if (recordIndex === -1) {
      return;
    }
    const [record] = this.inFlightRecords.splice(recordIndex, 1);
    const consumer = this.removeFromConsumer(record);
    if (consumer) {
      consumer.nacked += 1;
    }
    this.requeue(record.message);
  }

  private requeue(message: Message<T>): void {
    message.attempts += 1;
    message.redelivered = true;
    this.sentMessages.push(message);
  }

  private findInFlightIndex(
    message: Message<T>,
    consumerId?: number,
  ): number {
    return this.inFlightRecords.findIndex(
      (record) =>
        record.message.id === message.id &&
        (consumerId === undefined || record.consumerId === consumerId),
    );
  }

  private removeFromConsumer(
    record: InFlightRecord<T>,
  ): Consumer<T> | undefined {
    if (record.consumerId === undefined) {
      return undefined;
    }
    const consumer = this.consumers.find(
      (item) => item.id === record.consumerId,
    );
    if (!consumer) {
      return undefined;
    }
    const index = consumer.inFlight.findIndex(
      (message) => message.id === record.message.id,
    );
    if (index !== -1) {
      consumer.inFlight.splice(index, 1);
    }
    return consumer;
  }
}
