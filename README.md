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

## Examples

```ts
import "jest-mq/matchers";
import { MessageQueue } from "jest-mq";

// Production broker shape (keep this in your app).
export type OrderCreated = { type: "order.created"; orderId: string };
export type Broker<T> = {
  publish: (message: T) => Promise<void> | void | Promise<number> | number;
  subscribe: (
    messageType: string | undefined,
    handler: (message: T) => Promise<void> | void,
  ) => () => void;
  ack: (message: T) => void;
};
export const handleOrderCreated = async (
  message: OrderCreated,
  deps: { notifier: { send: (orderId: string) => Promise<void> } },
) => {
  await deps.notifier.send(message.orderId);
};

// Test: publish + deterministic ids.
const queue = new MessageQueue<OrderCreated>("orders");
queue.publish({ type: "order.created", orderId: "order-123" });
queue.publish({ type: "order.created", orderId: "order-456" });
expect(queue).toBeInQueue({ type: "order.created", orderId: "order-123" });
expect(queue.peekReady("order.created")?.orderId).toBe("order-123");
const first = queue.receiveMessage("order.created");
const second = queue.receiveMessage("order.created");
expect(first).toMatchObject({ orderId: "order-123", id: 0 });
expect(second).toMatchObject({ orderId: "order-456", id: 1 });
await queue.flush();

// Test: deterministic worker with a real handler and external dependency.
const notifier = { send: jest.fn().mockResolvedValue(undefined) };
const queueForWorker = new MessageQueue<OrderCreated>("orders", {
  dispatchOnPublish: false,
});
queueForWorker.consume(
  "order.created",
  async (message) => {
    await handleOrderCreated(message, { notifier });
    queueForWorker.ack(message);
  },
  { autoAck: false, prefetch: 1 },
);
queueForWorker.publish({ type: "order.created", orderId: "order-123" });
await queueForWorker.flush();
expect(notifier.send).toHaveBeenCalledWith("order-123");

// Test: immediate dispatch (default) with error capture before clear.
const legacyQueue = new MessageQueue<OrderCreated>("orders");
legacyQueue.subscribe("order.created", async (message) => {
  legacyQueue.ack(message);
});
legacyQueue.publish({ type: "order.created", orderId: "order-789" });
await legacyQueue.flush(); // call before clear to capture handler errors
legacyQueue.clear();

// Assertions & matchers.
expect(queue).toHaveReadyCount(0);
expect(queue).toHaveInFlightCount(0);
expect(queue).toHaveAckedCount(2);
```

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
