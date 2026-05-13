# jest-mq

![npm](https://img.shields.io/npm/v/jest-mq)
![ci](https://img.shields.io/github/actions/workflow/status/403-html/jest-mq/ci.yml?branch=main)
![node](https://img.shields.io/badge/node-24.12%2B-green)

Utilities and matchers for testing message queue interactions in Jest. Fully compatible with Jest's expect API, `jest-mq` simplifies testing of message publishing, message consumption, and message routing without needing a broker.

## Installation

```sh
npm install --save-dev jest-mq
```

## Usage

```ts
// jest.setup.ts
import "jest-mq/matchers";
```

## How it fits together

Production code uses your real broker clients directly. Tests replace that wiring with `jest-mq`. Keep a thin broker interface in your app (recommended anyway): `MessageQueue` satisfies `MessageQueueAdapter<T>` structurally, so it drops in without your production app ever importing a testing tool.

Note: `MessageQueue` adds test-only metadata (`id` and a normalized `type`) so it can route handlers, support acks, and keep deterministic ordering. Your app message types stay clean and app-defined.

## App + test (compact example)

```ts
// app/order/order.ts

// define a broker port in your app; MessageQueue<T> satisfies it structurally in tests
export type Broker<T> = {
  publish: (message: T) => Promise<number> | number;
  subscribe: (
    messageType: string | undefined,
    handler: (message: T) => Promise<void> | void,
  ) => () => void;
  ack: (message: T) => void;
};

export type OrderCreated = { type: "order.created"; orderId: string };

export const publishOrder = (broker: Broker<OrderCreated>, orderId: string) =>
  broker.publish({ type: "order.created", orderId });

export const registerOrderConsumer = (broker: Broker<OrderCreated>) =>
  broker.subscribe("order.created", async (message) => {
    broker.ack(message);
  });
```

```ts
// app/order/order.test.ts
import "jest-mq/matchers"; // or import in jest setup
import { MessageQueue } from "jest-mq";
import { publishOrder, type OrderCreated } from "./order";

describe("orders", () => {
  it("publishes order.created with deterministic ids", async () => {
    const queue = new MessageQueue<OrderCreated>("orders");

    await publishOrder(queue, "order-123");
    await publishOrder(queue, "order-456");

    expect(queue).toBeInQueue({ type: "order.created", orderId: "order-123" });
    expect(queue).toBeInQueue({ type: "order.created", orderId: "order-456" });

    const peeked = queue.peek("order.created");
    expect(peeked?.orderId).toBe("order-123");
    // peek does not consume; messages are still in queue
    expect(queue).toBeInQueue({ type: "order.created", orderId: "order-123" });

    const first = queue.receiveMessage("order.created");
    const second = queue.receiveMessage("order.created");
    expect(first).toMatchObject({ orderId: "order-123", id: 0 });
    expect(second).toMatchObject({ orderId: "order-456", id: 1 });

    await queue.flush();
  });
});
```

## API

### `MessageQueue<T>`

```ts
const queue = new MessageQueue<MyMessage>("queue-name");
```

| Method | Description |
|---|---|
| `publish(message)` | Enqueues a message and fires subscribed handlers. Returns the message `id`. |
| `receiveMessage(type?, autoAck?)` | Dequeues the first matching message. `autoAck` defaults to `true`. |
| `peek(type?)` | Reads the first matching message without consuming it (`autoAck = false`). |
| `ack(message)` | Explicitly acknowledges a message received with `autoAck = false`. |
| `subscribe(type, handler)` | Registers a handler for a message type (or `undefined` for all types). Returns an unsubscribe function. |
| `flush()` | Awaits all pending handler executions. Throws `AggregateError` if any handler threw. |
| `clear()` | Resets all queue state. |

### `MessageQueueAdapter<T>`

A reference interface showing the shape `MessageQueue<T>` exposes. Use it to verify
your own production adapter is compatible, but define your broker port locally in your
app rather than importing this type into production code (`jest-mq` is a dev dependency).

```ts
// src/mq/broker.ts — define your own port in app code
export type Broker<T> = {
  publish: (message: T) => Promise<number> | number;
  subscribe: (...) => () => void;
  ack: (message: T) => void;
};

// MessageQueue<T> satisfies Broker<T> structurally, no cast needed
const queue = new MessageQueue<MyMessage>("q");
myFunction(queue); // works wherever Broker<MyMessage> is expected
```

### `expectMessage({ queue, messageType, timeout? })`

Polls a queue until a message of the given type arrives, then returns it. Rejects after `timeout` ms (default: 3000).

```ts
import { expectMessage } from "jest-mq";

const message = await expectMessage({ queue, messageType: "order.created" });
expect(message.orderId).toBe("order-123");
```

## Matchers

Register all matchers once in your Jest setup:

```ts
import "jest-mq/matchers";
```

### `toBeInQueue(expectedMessage)`

Asserts a message is currently in the queue (published but not yet consumed).

```ts
expect(queue).toBeInQueue({ type: "order.created", orderId: "order-123" });
```

### `toHaveEmptyQueue()`

Asserts no unconsumed messages remain in the queue.

```ts
expect(queue).toHaveEmptyQueue();
```

### `toHaveQueueSize(n)`

Asserts the number of unconsumed messages.

```ts
expect(queue).toHaveQueueSize(2);
```

### `toHaveReceived(expectedMessage)`

Asserts a message was consumed, either via `autoAck` or explicit `ack()`.

```ts
queue.receiveMessage("order.created"); // autoAck = true
expect(queue).toHaveReceived({ type: "order.created", orderId: "order-123" });
```

### `toHaveBeenAcked(expectedMessage)`

Asserts a message was **explicitly** acknowledged via `queue.ack(message)`. Does not pass for messages consumed via `autoAck`.

```ts
const msg = queue.receiveMessage("order.created", false); // autoAck = false
queue.ack(msg!);
expect(queue).toHaveBeenAcked({ type: "order.created", orderId: "order-123" });
```

### `toHaveOnlyTypes(types)`

Asserts every message published (sent or received) matches one of the given types.

```ts
expect(queue).toHaveOnlyTypes(["order.created", "payment.processed"]);
```

### `toHavePublishedTimes(expectedMessage, n)`

Asserts a specific message was published exactly `n` times across all sent and received messages.

```ts
expect(queue).toHavePublishedTimes({ type: "order.created", orderId: "x" }, 2);
```

## Scope and non-goals

- This is a deterministic test double plus matchers, not a full MQ emulator.
- `MessageQueue` models publish/subscribe and handler flushing.
- TODO: retries, DLQs, ordering guarantees, and other broker behaviors.
- This is meant for unit tests; integration tests should run against a real broker.
