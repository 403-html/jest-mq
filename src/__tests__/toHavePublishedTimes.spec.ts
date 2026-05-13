import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toHavePublishedTimes", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass when message count matches", () => {
    const message = { type: "test", payload: "test" };
    queue.publish(message);
    queue.publish(message);
    queue.receiveMessage("test");
    expect(queue).toHavePublishedTimes(message, 2);
  });

  it("should fail when message count does not match", () => {
    const message = { type: "test", payload: "test" };
    queue.publish(message);
    expect(() =>
      expect(queue).toHavePublishedTimes(message, 2),
    ).toThrowErrorMatchingSnapshot();
  });
});
