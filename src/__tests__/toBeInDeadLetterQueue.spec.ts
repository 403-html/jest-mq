import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toBeInDeadLetterQueue", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass if message is in dead letter queue", () => {
    const message = { type: "test", payload: "test" };
    queue.publish(message);
    queue.nack(queue.peek("test")!);
    expect(queue).toBeInDeadLetterQueue(message);
  });

  it("should fail if message is not in dead letter queue", () => {
    const message = { type: "test", payload: "test" };
    expect(() =>
      expect(queue).toBeInDeadLetterQueue(message),
    ).toThrowErrorMatchingSnapshot();
  });
});
