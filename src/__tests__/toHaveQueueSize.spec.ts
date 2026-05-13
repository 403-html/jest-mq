import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toHaveQueueSize", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass if queue size matches", () => {
    expect(queue).toHaveQueueSize(0);
    queue.publish({ type: "test", payload: "test" });
    queue.publish({ type: "test", payload: "test" });
    expect(queue).toHaveQueueSize(2);
  });

  it("should fail if queue size does not match", () => {
    queue.publish({ type: "test", payload: "test" });
    expect(() =>
      expect(queue).toHaveQueueSize(2),
    ).toThrowErrorMatchingSnapshot();
  });
});
