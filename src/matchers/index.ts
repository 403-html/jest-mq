import { toBeInQueue } from "./toBeInQueue";
import { toBeInDeadLetterQueue } from "./toBeInDeadLetterQueue";
import { toHaveEmptyQueue } from "./toHaveEmptyQueue";
import { toHaveBeenAcked } from "./toHaveBeenAcked";
import { toHaveOnlyTypes } from "./toHaveOnlyTypes";
import { toHavePublishedTimes } from "./toHavePublishedTimes";
import { toHaveQueueSize } from "./toHaveQueueSize";
import { toHaveDeadLetterQueueSize } from "./toHaveDeadLetterQueueSize";
import { toHaveReceived } from "./toHaveReceived";
import type { MessagePayload } from "../core/queue";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInQueue(expectedMessage: MessagePayload): R;
      toBeInDeadLetterQueue(expectedMessage: MessagePayload): R;
      toHaveEmptyQueue(): R;
      toHaveBeenAcked(expectedMessage: MessagePayload): R;
      toHaveOnlyTypes(expectedTypes: string[]): R;
      toHavePublishedTimes(
        expectedMessage: MessagePayload,
        expectedCount: number,
      ): R;
      toHaveQueueSize(expectedCount: number): R;
      toHaveDeadLetterQueueSize(expectedCount: number): R;
      toHaveReceived(expectedMessage: MessagePayload): R;
    }
  }
}

expect.extend({
  toBeInQueue,
  toBeInDeadLetterQueue,
  toHaveEmptyQueue,
  toHaveBeenAcked,
  toHaveOnlyTypes,
  toHavePublishedTimes,
  toHaveQueueSize,
  toHaveDeadLetterQueueSize,
  toHaveReceived,
});
