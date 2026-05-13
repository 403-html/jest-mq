import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toHaveQueueSize = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expectedCount: number,
) {
  const queue = received.getQueue();
  const actualCount = queue.sentMessages.length;
  const pass = actualCount === expectedCount;

  return {
    pass,
    message: () => {
      const hint = matcherHint(".toHaveQueueSize", "received", "expectedCount");
      const expectedStr = printExpected(expectedCount);
      const receivedStr = printReceived(actualCount);
      const messagesStr = printReceived(queue.sentMessages);
      return `${hint}
      
      Expected queue size:
        ${expectedStr}
      Received:
        ${receivedStr}
      Queue contents:
        ${messagesStr}`;
    },
  };
};
