import "../matchers";
import { MessageQueue } from "../core/queue";

describe("toHaveOnlyTypes", () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  afterEach(() => {
    queue.clear();
  });

  it("should pass when only expected types exist", () => {
    queue.publish({ type: "alpha", payload: "test" });
    queue.publish({ type: "beta", payload: "test" });
    queue.receiveMessage("alpha");
    expect(queue).toHaveOnlyTypes(["alpha", "beta"]);
  });

  it("should handle messages without a type", () => {
    queue.publish({ payload: "test" });
    expect(queue).toHaveOnlyTypes([""]);
  });

  it("should fail when unexpected types exist", () => {
    queue.publish({ type: "alpha", payload: "test" });
    queue.publish({ type: "gamma", payload: "test" });
    expect(() =>
      expect(queue).toHaveOnlyTypes(["alpha"]),
    ).toThrowErrorMatchingSnapshot();
  });
});
