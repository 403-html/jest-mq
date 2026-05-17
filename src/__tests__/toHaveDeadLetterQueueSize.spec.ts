import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toHaveDeadLetterQueueSize", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass if dead letter queue size matches", () => {
    expect(queue).toHaveDeadLetterQueueSize(0);
    queue.publish({ type: "test", payload: "first" });
    queue.publish({ type: "test", payload: "second" });
    queue.nack(queue.peek("test")!);
    queue.nack(queue.peek("test")!);
    expect(queue).toHaveDeadLetterQueueSize(2);
  });

  it("should fail if dead letter queue size does not match", () => {
    queue.publish({ type: "test", payload: "test" });
    queue.nack(queue.peek("test")!);
    expect(() =>
      expect(queue).toHaveDeadLetterQueueSize(2),
    ).toThrowErrorMatchingSnapshot();
  });
});
