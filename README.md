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

    const peek = queue.peekReady("order.created");
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

## Deterministic delivery helpers

By default, `publish()` still dispatches handlers (legacy behavior). For
deterministic tests, disable that with `dispatchOnPublish: false` and call
`flush()` (or `drain()`) to deliver messages.

```ts
const queue = new MessageQueue("jobs", {
  deliveryMode: "competing",
  dispatchOnPublish: false,
});
const jobRunner = {
  run: async (payload: string) => {
    // call your real job handler / worker
  },
};
const consumer = queue.consume(
  "job",
  async (message) => {
    await jobRunner.run(message.payload as string);
    queue.ack(message);
  },
  { autoAck: false, prefetch: 1 },
);

queue.publish({ type: "job", payload: "example" });
await queue.flush();
consumer.stats();
```

Ready-state helpers are available for assertions:

- `peekReady()` / `peekAllReady()`
- `readyCount()` / `inFlightCount()` / `ackedCount()`

If `dispatchOnPublish` is enabled (default), call `flush()` before `clear()`
to avoid dropping in-flight handler errors.

## Queue snapshot performance

`MessageQueue#getQueue()` returns cloned snapshots by default to keep consumers
from mutating internal state. For read-only inspection on large queues, pass
`false` to access live references and avoid repeated allocations.

Example run (Node 24.12, 100k messages, 200 iterations; your results may vary):

```text
queue size: 100000, iterations: 200
snapshot=true: 75.91ms
snapshot=false: 0.02ms
```

Replicate locally:

```sh
npm install
npm run build
node --input-type=module - <<'EOF'
import { MessageQueue } from "./dist/core/queue.js";
import { performance } from "node:perf_hooks";

const queue = new MessageQueue("bench");
const size = 100000;
for (let i = 0; i < size; i += 1) {
  queue.publish({ type: "t", payload: i });
}

const iterations = 200;
const measure = (snapshot) => {
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    queue.getQueue(snapshot);
  }
  return performance.now() - start;
};

// Warm-up to reduce JIT effects before timing.
measure(true);
measure(false);
const snapshotMs = measure(true);
const liveMs = measure(false);

console.log(`queue size: ${size}, iterations: ${iterations}`);
console.log(`snapshot=true: ${snapshotMs.toFixed(2)}ms`);
console.log(`snapshot=false: ${liveMs.toFixed(2)}ms`);
EOF
```

## Scope and non-goals

- This is a deterministic test double plus matchers, not a full MQ emulator.
- `MessageQueue` models publish/subscribe and handler flushing.
- TODO: retries, DLQs, ordering guarantees, and other broker behaviors.
- This is meant for unit tests; integration tests should run against a real broker.
