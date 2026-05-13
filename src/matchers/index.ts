import { toBeInQueue } from "./toBeInQueue";
import { toHaveEmptyQueue } from "./toHaveEmptyQueue";
import { toHaveBeenAcked } from "./toHaveBeenAcked";
import { toHaveOnlyTypes } from "./toHaveOnlyTypes";
import { toHavePublishedTimes } from "./toHavePublishedTimes";
import { toHaveQueueSize } from "./toHaveQueueSize";
import { toHaveReceived } from "./toHaveReceived";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInQueue(expectedMessage: any): R;
      toHaveEmptyQueue(): R;
      toHaveBeenAcked(expectedMessage: any): R;
      toHaveOnlyTypes(expectedTypes: string[]): R;
      toHavePublishedTimes(expectedMessage: any, expectedCount: number): R;
      toHaveQueueSize(expectedCount: number): R;
      toHaveReceived(expectedMessage: any): R;
    }
  }
}

expect.extend({
  toBeInQueue,
  toHaveEmptyQueue,
  toHaveBeenAcked,
  toHaveOnlyTypes,
  toHavePublishedTimes,
  toHaveQueueSize,
  toHaveReceived,
});
