import { toBeInQueue } from "./toBeInQueue";
import { toHaveEmptyQueue } from "./toHaveEmptyQueue";
import { toHaveBeenAcked } from "./toHaveBeenAcked";
import { toHaveOnlyTypes } from "./toHaveOnlyTypes";
import { toHavePublishedTimes } from "./toHavePublishedTimes";
import { toHaveQueueSize } from "./toHaveQueueSize";
import { toHaveReceived } from "./toHaveReceived";
import type { MessagePayload } from "../core/queue";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInQueue(expectedMessage: MessagePayload): R;
      toHaveEmptyQueue(): R;
      toHaveBeenAcked(expectedMessage: MessagePayload): R;
      toHaveOnlyTypes(expectedTypes: string[]): R;
      toHavePublishedTimes(
        expectedMessage: MessagePayload,
        expectedCount: number,
      ): R;
      toHaveQueueSize(expectedCount: number): R;
      toHaveReceived(expectedMessage: MessagePayload): R;
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
