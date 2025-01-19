import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toHaveEmptyQueue", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass if queue is empty", () => {
    expect(queue).toHaveEmptyQueue();
  });

  it("should fail if queue is not empty", () => {
    queue.sendMessage({ type: "test", payload: "test" });
    expect(() =>
      expect(queue).toHaveEmptyQueue(),
    ).toThrowErrorMatchingSnapshot();
  });

  it("should send, receive, and check if queue is empty", () => {
    queue.sendMessage({ type: "test", payload: "test" });
    expect(queue).not.toHaveEmptyQueue();
    queue.receiveMessage();
    expect(queue).toHaveEmptyQueue();
  });
});
