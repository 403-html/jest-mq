import { MessageQueue } from "../core/queue";

describe("MessageQueue", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test", { dispatchOnPublish: false });
  });

  afterEach(() => {
    queue.clear();
  });

  describe("constructor", () => {
    it("should create a new queue", () => {
      expect(queue).toBeDefined();
    });

    it("should have a name", () => {
      expect(queue.name).toEqual("test");
    });

    it("should throw an error if no name is provided", () => {
      expect(() => new MessageQueue("")).toThrow("Queue name is required");
    });

    it("should throw an error if the name is too long", () => {
      expect(() => new MessageQueue("a".repeat(256))).toThrow(
        "Queue name is too long",
      );
    });

    it("should throw an error if the name contains spaces", () => {
      expect(() => new MessageQueue("test queue")).toThrow(
        "Queue name cannot contain spaces",
      );
    });

    it("should throw an error if the name is not a string", () => {
      expect(() => new MessageQueue(null as unknown as string)).toThrow(
        "Queue name is required",
      );
    });
  });

  describe("publish", () => {
    it("should publish a message", () => {
      const id = queue.publish({ type: "test", payload: "test" });
      expect(id).toBe(0);
      expect(queue.readyCount()).toBe(1);
    });
  });

  describe("ack", () => {
    it("should ack a message", () => {
      queue.publish({ type: "test", payload: "test" });
      const message = queue.receiveMessage("test", false);

      expect(queue.readyCount()).toBe(0);
      expect(queue.inFlightCount()).toBe(1);
      queue.ack(message!);
      expect(queue.inFlightCount()).toBe(0);
      expect(queue.ackedCount()).toBe(1);
    });

    it("should ignore ack when message is not in sent queue", () => {
      queue.publish({ type: "test", payload: "test" });
      const message = queue.receiveMessage("test", false);
      queue.ack(message!);

      expect(queue.readyCount()).toBe(0);
      expect(queue.ackedCount()).toBe(1);

      queue.ack(message!);
      expect(queue.readyCount()).toBe(0);
      expect(queue.ackedCount()).toBe(1);
    });
  });

  describe("receiveMessage", () => {
    it("should receive a message without specifying a type", () => {
      const message1 = { payload: "first message" };

      queue.publish(message1);

      const receivedMessage1 = queue.receiveMessage();

      expect(receivedMessage1).toEqual({
        ...message1,
        id: expect.any(Number),
        type: undefined,
        attempts: 0,
        redelivered: false,
      });

      expect(queue.readyCount()).toBe(0);
      expect(queue.ackedCount()).toBe(1);
    });

    it("should return undefined if no messages are available", () => {
      const receivedMessage = queue.receiveMessage();
      expect(receivedMessage).toBeUndefined();
    });

    it("should not mutate received messages when queue is empty", () => {
      queue.receiveMessage();
      expect(queue.ackedCount()).toBe(0);
      expect(queue.readyCount()).toBe(0);
    });

    it("should return undefined if no matching messages are available", () => {
      queue.publish({ type: "otherType", payload: "test" });
      const receivedMessage = queue.receiveMessage("nonExistentType");
      expect(receivedMessage).toBeUndefined();
    });

    it("should receive a message by type", () => {
      const message = { type: "test", payload: "test" };
      queue.publish(message);
      const receivedMessage = queue.receiveMessage(message.type);

      expect(receivedMessage).toEqual({
        ...message,
        id: expect.any(Number),
        attempts: 0,
        redelivered: false,
      });
    });
  });

  describe("helpers", () => {
    it("should peek ready messages and counts", () => {
      queue.publish({ type: "peek", payload: "first" });
      queue.publish({ type: "peek", payload: "second" });

      expect(queue.readyCount()).toBe(2);
      expect(queue.peekReady("peek")?.payload).toBe("first");
      expect(queue.peekAllReady("peek")).toHaveLength(2);
    });

    it("should wait for a predicate to become true", async () => {
      const waitPromise = queue.waitFor(
        () => queue.readyCount() === 1,
        { timeoutMs: 100 },
      );

      queue.publish({ type: "ready", payload: "one" });

      await expect(waitPromise).resolves.toBeUndefined();
    });

    it("should time out when predicate stays false", async () => {
      await expect(
        queue.waitFor(() => false, { timeoutMs: 20 }),
      ).rejects.toThrow("Timeout waiting for condition after 20ms");
    });
  });

  describe("subscribe", () => {
    it("should not run handlers until flush", async () => {
      const handler = jest.fn();
      queue.subscribe("orderCreated", handler);

      queue.publish({ type: "orderCreated", orderId: 123 });

      expect(handler).not.toHaveBeenCalled();

      await queue.flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should subscribe to a message type", async () => {
      const handler = jest.fn();
      queue.subscribe("orderCreated", handler);

      const firstMessage = { type: "orderCreated", orderId: 123 };
      const secondMessage = { type: "orderCreated", orderId: 456 };
      queue.publish(firstMessage);
      queue.publish(secondMessage);

      await queue.flush();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls).toEqual([
        [
          {
            ...firstMessage,
            id: 0,
            attempts: 0,
            redelivered: false,
          },
        ],
        [
          {
            ...secondMessage,
            id: 1,
            attempts: 0,
            redelivered: false,
          },
        ],
      ]);
    });

    it("should unsubscribe a subscribed handler", async () => {
      const handler = jest.fn();
      const unsubscribe = queue.subscribe("orderCreated", handler);

      const firstMessage = { type: "orderCreated", orderId: 123 };
      const secondMessage = { type: "orderCreated", orderId: 456 };
      queue.publish(firstMessage);
      await queue.flush();
      unsubscribe();
      queue.publish(secondMessage);
      await queue.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toEqual({
        ...firstMessage,
        id: 0,
        attempts: 0,
        redelivered: false,
      });
    });

    it("should process handlers for specific message types", async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      queue.subscribe("orderCreated", handler1);
      queue.subscribe("orderCreated", handler2);

      const message = { type: "orderCreated", orderId: 123 };
      queue.publish(message);

      await queue.flush();

      expect(handler1).toHaveBeenCalledWith(
        expect.objectContaining({
          ...message,
          id: expect.any(Number),
          attempts: 0,
          redelivered: false,
        }),
      );
      expect(handler2).toHaveBeenCalledWith(
        expect.objectContaining({
          ...message,
          id: expect.any(Number),
          attempts: 0,
          redelivered: false,
        }),
      );
    });

    it("should process default handlers (no type specified)", async () => {
      const defaultHandler = jest.fn();
      queue.subscribe(undefined, defaultHandler);

      const message = { type: "anyType", data: "some data" };
      queue.publish(message);

      await queue.flush();

      expect(defaultHandler).toHaveBeenCalledWith({
        ...message,
        id: expect.any(Number),
        attempts: 0,
        redelivered: false,
      });
    });

    it("should only call default handlers once when type is undefined", async () => {
      const defaultHandler = jest.fn();
      queue.subscribe(undefined, defaultHandler);

      queue.publish({ type: undefined, data: "no type" });

      await queue.flush();
      expect(defaultHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle asynchronous handlers", async () => {
      const asyncHandler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      queue.subscribe("asyncMessage", asyncHandler);
      queue.publish({ type: "asyncMessage" });

      await queue.flush();
      expect(asyncHandler).toHaveBeenCalled();
    });

    it("should not call handlers for other message types", async () => {
      const handler = jest.fn();
      queue.subscribe("orderCreated", handler);

      queue.publish({ type: "paymentProcessed" });

      await queue.flush();
      expect(handler).not.toHaveBeenCalled();
    });

    it("subscribe return should remove the handler (specific type)", async () => {
      const handler = jest.fn();
      const unsubscribe = queue.subscribe("orderCreated", handler);

      const message = { type: "orderCreated", orderId: 123 };
      queue.publish(message);

      await queue.flush();
      unsubscribe();
      queue.publish(message);
      await queue.flush();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("subscribe return should remove the handler (default type)", async () => {
      const handler = jest.fn();
      const unsubscribe = queue.subscribe(undefined, handler);

      const message = { type: "anyType", orderId: 123 };
      queue.publish(message);

      await queue.flush();
      unsubscribe();
      queue.publish(message);
      await queue.flush();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("subscribe return should handle multiple handlers for the same type", async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsubscribe1 = queue.subscribe("orderCreated", handler1);
      queue.subscribe("orderCreated", handler2);

      const message = { type: "orderCreated", orderId: 123 };
      queue.publish(message);

      await queue.flush();
      unsubscribe1();
      queue.publish(message);
      await queue.flush();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(2);
    });

    it("subscribe return should handle unsubscribing a handler that was never added", () => {
      const handler = jest.fn();
      const unsubscribe = queue.subscribe("orderCreated", handler);

      unsubscribe();
      unsubscribe();

      const message = { type: "orderCreated", orderId: 123 };
      queue.publish(message);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("backwards compatibility", () => {
    it("should dispatch handlers on publish by default", async () => {
      const legacyQueue = new MessageQueue("legacy");
      const handler = jest.fn();

      legacyQueue.subscribe("legacy", handler);
      legacyQueue.publish({ type: "legacy", payload: "test" });

      await legacyQueue.flush();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("delivery mode", () => {
    it("should deliver to one handler in competing mode", async () => {
      queue = new MessageQueue("test", { deliveryMode: "competing" });
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      queue.subscribe("work", handler1);
      queue.subscribe("work", handler2);

      queue.publish({ type: "work", payload: "first" });
      queue.publish({ type: "work", payload: "second" });

      await queue.flush();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1.mock.calls[0][0].payload).toBe("first");
      expect(handler2.mock.calls[0][0].payload).toBe("second");
    });
  });

  describe("consume", () => {
    it("should leave messages in-flight until acked", async () => {
      const handled: Array<{ id: number }> = [];
      const consumer = queue.consume(
        "work",
        (message) => {
          handled.push(message);
        },
        { autoAck: false, prefetch: 1 },
      );

      queue.publish({ type: "work", payload: "job" });
      await queue.flush();

      expect(queue.readyCount()).toBe(0);
      expect(queue.inFlightCount()).toBe(1);
      expect(consumer.stats().inFlight).toBe(1);

      queue.ack(handled[0]);

      expect(queue.inFlightCount()).toBe(0);
      expect(queue.ackedCount()).toBe(1);
      expect(consumer.stats().acked).toBe(1);
    });

    it("should requeue messages on nack with attempts", async () => {
      let handled: { attempts: number; redelivered: boolean } | undefined;
      queue.consume(
        "retry",
        (message) => {
          handled = message;
        },
        { autoAck: false, prefetch: 1 },
      );

      queue.publish({ type: "retry", payload: "job" });
      await queue.flush();

      queue.nack(handled!);

      expect(queue.readyCount()).toBe(1);
      const peeked = queue.peekReady("retry");
      expect(peeked).toMatchObject({ attempts: 1, redelivered: true });
    });

    it("should requeue in-flight messages when consumer stops", async () => {
      const consumer = queue.consume(
        "stop",
        () => undefined,
        { autoAck: false, prefetch: 1 },
      );

      queue.publish({ type: "stop", payload: "job" });
      await queue.flush();

      consumer.stop();

      expect(queue.inFlightCount()).toBe(0);
      expect(queue.readyCount()).toBe(1);
      expect(queue.peekReady("stop")).toMatchObject({
        attempts: 1,
        redelivered: true,
      });
    });

    it("should respect prefetch limits", async () => {
      let resolveFirst: () => void;
      const firstGate = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      const handler = jest.fn((message: { payload?: string }) => {
        if (message.payload === "first") {
          return firstGate;
        }
        return undefined;
      });

      queue.consume("prefetch", handler, { prefetch: 1 });
      queue.publish({ type: "prefetch", payload: "first" });
      queue.publish({ type: "prefetch", payload: "second" });

      const flushPromise = queue.flush();
      await new Promise((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(1);

      resolveFirst!();
      await flushPromise;

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should reject invalid prefetch values", () => {
      expect(() =>
        queue.consume("invalid", () => undefined, { prefetch: 0 }),
      ).toThrow("Prefetch must be at least 1, got 0");
    });
  });

  describe("flush", () => {
    it("should surface handler errors", async () => {
      const handler = jest.fn(() => {
        throw new Error("handler failed");
      });

      queue.subscribe("errorEvent", handler);
      queue.publish({ type: "errorEvent" });

      try {
        await queue.flush();
        throw new Error("Expected flush to throw");
      } catch (error) {
        const aggregate = error as AggregateError;
        expect(aggregate.message).toBe("One or more message handlers failed");
        expect(aggregate.errors[0]).toBeInstanceOf(Error);
        expect((aggregate.errors[0] as Error).message).toBe("handler failed");
      }
    });

    it("should keep running other handlers when one fails", async () => {
      const failingHandler = jest.fn(() => {
        throw new Error("handler failed");
      });
      const successHandler = jest.fn();

      queue.subscribe("isolatedEvent", failingHandler);
      queue.subscribe("isolatedEvent", successHandler);
      queue.publish({ type: "isolatedEvent" });

      await expect(queue.flush()).rejects.toThrow(
        "One or more message handlers failed",
      );
      expect(failingHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledTimes(1);
    });

    it("should stop dispatching on first error when failFast is true", async () => {
      const handler = jest.fn((message: { payload?: string }) => {
        if (message.payload === "fail") {
          throw new Error("handler failed");
        }
      });

      queue.subscribe("failFast", handler);
      queue.publish({ type: "failFast", payload: "fail" });
      queue.publish({ type: "failFast", payload: "later" });

      await expect(queue.flush({ failFast: true })).rejects.toThrow(
        "One or more message handlers failed",
      );
      expect(queue.readyCount()).toBe(1);
    });

    it("should throw the first error when captureErrors is false", async () => {
      const handler = jest.fn(() => {
        throw new Error("handler failed");
      });

      queue.subscribe("capture", handler);
      queue.publish({ type: "capture" });

      try {
        await queue.flush({ captureErrors: false });
        throw new Error("Expected flush to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(AggregateError);
        expect((error as Error).message).toBe("handler failed");
      }
    });

    it("should wait for concurrent handlers to finish before resolving", async () => {
      let resolveFirst: () => void;
      let resolveSecond: () => void;
      const firstGate = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      const secondGate = new Promise<void>((resolve) => {
        resolveSecond = resolve;
      });

      const handler = jest.fn((message: { payload?: unknown }) => {
        if (message.payload === "first") {
          return firstGate;
        }
        return secondGate;
      });

      queue.subscribe("concurrentEvent", handler);
      queue.publish({ type: "concurrentEvent", payload: "first" });
      queue.publish({ type: "concurrentEvent", payload: "second" });

      let flushResolved = false;
      const flushPromise = queue.flush().then(() => {
        flushResolved = true;
      });

      await new Promise((resolve) => setImmediate(resolve));
      expect(flushResolved).toBe(false);

      resolveFirst();
      await new Promise((resolve) => setImmediate(resolve));
      expect(flushResolved).toBe(false);

      resolveSecond();
      await flushPromise;
      expect(flushResolved).toBe(true);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
