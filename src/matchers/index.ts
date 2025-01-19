import { toBeInQueue } from "./toBeInQueue";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInQueue(expectedMessage: any): R;
    }
  }
}

expect.extend({
  toBeInQueue,
});
