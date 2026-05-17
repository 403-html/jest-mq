import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toHaveDeadLetterQueueSize = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expectedCount: number,
) {
  const queue = received.getQueue();
  const actualCount = queue.deadLetterMessages.length;
  const pass = actualCount === expectedCount;

  return {
    pass,
    message: () => {
      const hint = matcherHint(
        ".toHaveDeadLetterQueueSize",
        "received",
        "expectedCount",
      );
      const expectedStr = printExpected(expectedCount);
      const receivedStr = printReceived(actualCount);
      const messagesStr = printReceived(queue.deadLetterMessages);
      return `${hint}

      Expected dead letter queue size:
        ${expectedStr}
      Received:
        ${receivedStr}
      Dead letter queue contents:
        ${messagesStr}`;
    },
  };
};
