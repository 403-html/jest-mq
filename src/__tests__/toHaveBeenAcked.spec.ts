import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toHaveBeenAcked", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass if message was acked", () => {
    const message = { type: "test", payload: "test" };
    queue.publish(message);
    const received = queue.receiveMessage("test", false);
    if (received) {
      queue.ack(received);
    }
    expect(queue).toHaveBeenAcked(message);
  });

  it("should fail if message was not acked", () => {
    const message = { type: "test", payload: "test" };
    queue.publish(message);
    expect(() =>
      expect(queue).toHaveBeenAcked(message),
    ).toThrowErrorMatchingSnapshot();
  });
});
