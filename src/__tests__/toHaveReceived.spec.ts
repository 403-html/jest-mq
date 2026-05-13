import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toHaveReceived", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass if message was received", () => {
    const message = { type: "test", payload: "test" };
    queue.publish(message);
    queue.receiveMessage("test");
    expect(queue).toHaveReceived(message);
  });

  it("should fail if message was not received", () => {
    const message = { type: "test", payload: "test" };
    queue.publish(message);
    expect(() =>
      expect(queue).toHaveReceived(message),
    ).toThrowErrorMatchingSnapshot();
  });
});
