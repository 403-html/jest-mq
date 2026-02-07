import { toBeInQueue } from "./toBeInQueue";
import { toHaveEmptyQueue } from "./toHaveEmptyQueue";
import { toHaveReadyCount } from "./toHaveReadyCount";
import { toHaveInFlightCount } from "./toHaveInFlightCount";
import { toHaveAckedCount } from "./toHaveAckedCount";
import type { MessagePayload } from "../core/queue";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInQueue(expectedMessage: MessagePayload): R;
      toHaveEmptyQueue(): R;
      toHaveReadyCount(expected: number): R;
      toHaveInFlightCount(expected: number): R;
      toHaveAckedCount(expected: number): R;
    }
  }
}

expect.extend({
  toBeInQueue,
  toHaveEmptyQueue,
  toHaveReadyCount,
  toHaveInFlightCount,
  toHaveAckedCount,
});
