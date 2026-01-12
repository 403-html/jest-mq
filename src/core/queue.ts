export type Message<T = any> = { type: string | undefined; id: number } & T;
export type MessageHandler<T = any> = (
  message: Message<T>,
) => Promise<void> | void;

export class MessageQueue<T = any> {
  private sentMessages: Message<T>[] = [];
  private receivedMessages: Message<T>[] = [];
  private handlers: Map<string | undefined, MessageHandler<T>[]> = new Map();
  private messageCount: number = 0;
  private pendingHandlers: Set<Promise<void>> = new Set();
  private handlerErrors: Error[] = [];

  constructor(public name: string) {
    if (!name) {
      throw new Error("Queue name is required");
    }
    if (name.length > 255) {
      throw new Error("Queue name is too long");
    }
    if (name.includes(" ")) {
      throw new Error("Queue name cannot contain spaces");
    }
  }

  getQueue(): {
    name: string;
    sentMessages: Message<T>[];
    receivedMessages: Message<T>[];
    handlers: Map<string | undefined, MessageHandler<T>[]>;
  } {
    return {
      name: this.name,
      sentMessages: [...this.sentMessages],
      receivedMessages: [...this.receivedMessages],
      handlers: new Map(this.handlers),
    };
  }

  clear(): void {
    this.sentMessages = [];
    this.receivedMessages = [];
    this.handlers.clear();
    this.messageCount = 0;
    this.pendingHandlers.clear();
    this.handlerErrors = [];
  }

  private async processHandlers(messageWithId: Message<T>): Promise<void> {
    const handlers = [
      ...(this.handlers.get(messageWithId.type) || []),
      ...(this.handlers.get(undefined) || []),
    ];

    const processing = Promise.all(
      handlers.map((handler) =>
        Promise.resolve()
          .then(() => handler(messageWithId))
          .catch((error) => {
            this.handlerErrors.push(
              error instanceof Error ? error : new Error(String(error)),
            );
          }),
      ),
    ).then(() => undefined);

    this.pendingHandlers.add(processing);
    processing.finally(() => this.pendingHandlers.delete(processing));
  }

  sendMessage(message: T): number {
    const messageWithId: Message<T> = {
      ...message,
      type: (message as any).type,
      id: this.messageCount++,
    };
    this.sentMessages.push(messageWithId);
    void this.processHandlers(messageWithId);
    return messageWithId.id;
  }

  receiveMessage(messageType?: string, autoAck = true): Message<T> | undefined {
    const messageIndex = messageType
      ? this.sentMessages.findIndex((m) => m.type === messageType)
      : 0;
    if (messageIndex === -1) {
      return undefined;
    }

    const message = this.sentMessages[messageIndex];

    if (autoAck) {
      this.sentMessages.splice(messageIndex, 1);
      this.receivedMessages.push(message);
    }

    return message;
  }

  onMessage(
    messageType: string | undefined,
    handler: MessageHandler<T>,
  ): () => void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    this.handlers.get(messageType)?.push(handler);

    return () => this.offMessage(messageType, handler);
  }

  offMessage(
    messageType: string | undefined,
    handler: MessageHandler<T>,
  ): void {
    if (this.handlers.has(messageType)) {
      const handlersForType = this.handlers.get(messageType)!;
      this.handlers.set(
        messageType,
        handlersForType.filter((h) => h !== handler),
      );
    }
  }

  async flush(): Promise<void> {
    await Promise.all(Array.from(this.pendingHandlers));
    if (this.handlerErrors.length > 0) {
      const errors = this.handlerErrors;
      this.handlerErrors = [];
      throw new AggregateError(errors, "One or more message handlers failed");
    }
  }
}
