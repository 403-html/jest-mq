import { MessageQueue } from "../core/queue";

describe("MessageQueue", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
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
      expect(() => new MessageQueue("")).toThrowError("Queue name is required");
    });

    it("should throw an error if the name is too long", () => {
      expect(() => new MessageQueue("a".repeat(256))).toThrowError(
        "Queue name is too long",
      );
    });

    it("should throw an error if the name contains spaces", () => {
      expect(() => new MessageQueue("test queue")).toThrowError(
        "Queue name cannot contain spaces",
      );
    });

    it("should throw an error if the name is not a string", () => {
      expect(() => new MessageQueue(null as unknown as string)).toThrowError(
        "Queue name is required",
      );
    });
  });

  describe("publish", () => {
    it("should publish a message", () => {
      const id = queue.publish({ type: "test", payload: "test" });
      expect(id).toBe(0);
      expect(queue.getQueue().sentMessages).toHaveLength(1);
    });
  });

  describe("ack", () => {
    it("should ack a message", () => {
      queue.publish({ type: "test", payload: "test" });
      const message = queue.receiveMessage("test", false);

      expect(queue.getQueue().sentMessages).toHaveLength(1);
      queue.ack(message!);
      expect(queue.getQueue().sentMessages).toHaveLength(0);
      expect(queue.getQueue().receivedMessages).toHaveLength(1);
    });

    it("should ignore ack when message is not in sent queue", () => {
      queue.publish({ type: "test", payload: "test" });
      const message = queue.receiveMessage("test", false);
      queue.ack(message!);

      expect(queue.getQueue().sentMessages).toHaveLength(0);
      expect(queue.getQueue().receivedMessages).toHaveLength(1);

      queue.ack(message!);
      expect(queue.getQueue().sentMessages).toHaveLength(0);
      expect(queue.getQueue().receivedMessages).toHaveLength(1);
    });
  });

  describe("receiveMessage", () => {
    it("should receive a message without specifying a type", () => {
      const message1 = { payload: "first message" };

      queue.publish(message1);

      const receivedMessage1 = queue.receiveMessage();

      expect(receivedMessage1).toEqual({ ...message1, id: expect.any(Number) });

      expect(queue.getQueue().sentMessages).toHaveLength(0);
    });

    it("should return undefined if no messages are available", () => {
      const receivedMessage = queue.receiveMessage();
      expect(receivedMessage).toBeUndefined();
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

      expect(receivedMessage).toEqual({ ...message, id: expect.any(Number) });
    });
  });

  describe("subscribe", () => {
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
        [{ ...firstMessage, id: 0 }],
        [{ ...secondMessage, id: 1 }],
      ]);
    });

    it("should unsubscribe a subscribed handler", async () => {
      const handler = jest.fn();
      const unsubscribe = queue.subscribe("orderCreated", handler);

      const firstMessage = { type: "orderCreated", orderId: 123 };
      const secondMessage = { type: "orderCreated", orderId: 456 };
      queue.publish(firstMessage);
      unsubscribe();
      queue.publish(secondMessage);

      await queue.flush();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toEqual({ ...firstMessage, id: 0 });
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
        expect.objectContaining({ ...message, id: expect.any(Number) }),
      );
      expect(handler2).toHaveBeenCalledWith(
        expect.objectContaining({ ...message, id: expect.any(Number) }),
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
      });
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

    it("should not call handlers for other message types", () => {
      const handler = jest.fn();
      queue.subscribe("orderCreated", handler);

      queue.publish({ type: "paymentProcessed" });

      expect(handler).not.toHaveBeenCalled();
    });

    it("subscribe return should remove the handler (specific type)", async () => {
      const handler = jest.fn();
      const unsubscribe = queue.subscribe("orderCreated", handler);

      const message = { type: "orderCreated", orderId: 123 };
      queue.publish(message);

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
  });
});
