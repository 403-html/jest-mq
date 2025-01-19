import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toBeInQueue", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass if message is in queue", () => {
    const message = { type: "test", payload: "test" };
    queue.sendMessage(message);
    expect(queue).toBeInQueue(message);
  });

  it("should fail if message is not in queue", () => {
    const message = { type: "test", payload: "test" };
    expect(() =>
      expect(queue).toBeInQueue(message),
    ).toThrowErrorMatchingSnapshot();
  });
});
