import { toBeInQueue } from "./toBeInQueue";
import { toHaveEmptyQueue } from "./toHaveEmptyQueue";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInQueue(expectedMessage: any): R;
      toHaveEmptyQueue(): R;
    }
  }
}

expect.extend({
  toBeInQueue,
  toHaveEmptyQueue,
});
