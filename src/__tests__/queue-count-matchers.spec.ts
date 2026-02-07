import "../matchers";
import { MessageQueue } from "../core/queue";

describe("queue count matchers", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test", { dispatchOnPublish: false });
  });

  afterEach(() => {
    queue.clear();
  });

  it("should match ready counts", () => {
    queue.publish({ type: "ready", payload: "test" });
    expect(queue).toHaveReadyCount(1);
  });

  it("should match in-flight and acked counts", () => {
    queue.publish({ type: "work", payload: "test" });
    const message = queue.receiveMessage("work", false);

    expect(queue).toHaveInFlightCount(1);
    queue.ack(message!);

    expect(queue).toHaveInFlightCount(0);
    expect(queue).toHaveAckedCount(1);
  });

  it("should show a readable error when counts differ", () => {
    expect(() => expect(queue).toHaveReadyCount(1)).toThrowErrorMatchingSnapshot();
  });
});
