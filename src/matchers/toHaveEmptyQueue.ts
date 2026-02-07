import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived } from "jest-matcher-utils";

export const toHaveEmptyQueue = function (
  this: jest.MatcherContext,
  received: MessageQueue,
) {
  const queue = received.getQueue(false);
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
