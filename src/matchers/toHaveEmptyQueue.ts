import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toHaveEmptyQueue = function (
  this: jest.MatcherContext,
  received: MessageQueue<any>,
) {
  const queue = received.getQueue();
  const queueIsEmpty = queue.sentMessages.length === 0;

  return {
    pass: queueIsEmpty,
    message: () => {
      const hint = matcherHint(".toHaveEmptyQueue", "received", "");
      const receivedStr = printReceived(queue.sentMessages);
      return `${hint}
      
      Expected queue to be empty, but it contains:
        ${receivedStr}`;
    },
  };
};
