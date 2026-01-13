# jest-mq

![status](https://img.shields.io/badge/status-development-blue)
![node](https://img.shields.io/badge/node-v23.6.0-red)

> Don't use this library yet. It's still in development. Check back later for a stable release.

This library provides utilities and matchers to facilitate the testing of message queue interactions in your applications. Fully compatible with Jest's expect API, `jest-mq` simplifies the testing of message publishing, message consumption, and message routing without need of a broker.

## How it fits together

Production code uses your real broker clients directly. Tests replace that wiring with `jest-mq`. If you keep a tiny broker interface in your app (recommended anyway), `MessageQueue` can satisfy it without your production app ever importing `jest-mq` or any other testing tool.

Note: `MessageQueue` adds test-only metadata (`id` and a normalized `type`) so it can route handlers, support acks, and keep deterministic ordering. Your app message types stay clean and app-defined.

## App + test (compact example)

```ts
// app/order/order.ts
export type OrderCreated = { type: "order.created"; orderId: string };

export type Broker<T> = {
  publish: (message: T) => Promise<void> | void | Promise<number> | number;
  subscribe: (
    messageType: string | undefined,
    handler: (message: T) => Promise<void> | void,
  ) => () => void;
  ack: (message: T) => void;
};

export const publishOrder = (broker: Broker<OrderCreated>, orderId: string) =>
  broker.publish({ type: "order.created", orderId });

export const registerOrderConsumer = (broker: Broker<OrderCreated>) =>
  broker.subscribe("order.created", async (message) => {
    broker.ack(message);
  });
```

```ts
// app/order/order.test.ts
import "jest-mq/matchers";
import { MessageQueue } from "jest-mq";
import { publishOrder, type OrderCreated } from "./order";

describe("orders", () => {
  it("publishes order.created with deterministic ids", async () => {
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
```

## Scope and non-goals

- This is a deterministic test double plus matchers, not a full MQ emulator.
- `MessageQueue` models publish/subscribe and handler flushing.
- TODO: retries, DLQs, ordering guarantees, and other broker behaviors.
- This is meant for unit tests; integration tests should run against a real broker.
