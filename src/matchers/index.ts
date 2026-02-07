import { toBeInQueue } from "./toBeInQueue";
import { toHaveEmptyQueue } from "./toHaveEmptyQueue";
import type { MessagePayload } from "../core/queue";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInQueue(expectedMessage: MessagePayload): R;
      toHaveEmptyQueue(): R;
    }
  }
}

expect.extend({
  toBeInQueue,
  toHaveEmptyQueue,
});
