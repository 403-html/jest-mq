import "../matchers";
import { MessageQueue } from "..";

type OrderCreated = { type: "order.created"; orderId: string };

type Broker<T> = {
  publish: (message: T) => Promise<void> | void | Promise<number> | number;
  subscribe: (
    messageType: string | undefined,
    handler: (message: T) => Promise<void> | void,
  ) => () => void;
  ack: (message: T) => void;
};

const publishOrder = (broker: Broker<OrderCreated>, orderId: string) =>
  broker.publish({ type: "order.created", orderId });

describe("readme example", () => {
  it("publishes, peeks, and consumes deterministically", async () => {
    const queue = new MessageQueue<OrderCreated>("orders");

    await publishOrder(queue, "order-123");
    await publishOrder(queue, "order-456");

    expect(queue).toBeInQueue({ type: "order.created", orderId: "order-123" });
    expect(queue).toBeInQueue({ type: "order.created", orderId: "order-456" });

    const peek = queue.receiveMessage("order.created", false);
    expect(peek?.orderId).toBe("order-123");
    expect(queue).toBeInQueue({ type: "order.created", orderId: "order-123" });
    expect(queue).toBeInQueue({ type: "order.created", orderId: "order-456" });

    const first = queue.receiveMessage("order.created");
    const second = queue.receiveMessage("order.created");
    expect(first).toMatchObject({ orderId: "order-123", id: 0 });
    expect(second).toMatchObject({ orderId: "order-456", id: 1 });

    await queue.flush();
  });
});
