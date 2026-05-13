import { MessageQueue, type MessagePayload } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toBeInQueue = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expectedMessage: MessagePayload,
) {
  const queue = received.getQueue();
  const messageIsInQueue = queue.sentMessages.some((message) => {
    return this.equals(
      // Exclude id from comparison, it's provided by the queue
      { ...message, id: undefined },
      expectedMessage,
    );
  });

  return {
    pass: messageIsInQueue,
    message: () => {
      const hint = matcherHint(".toBeInQueue", "received", "expectedMessage");
      const expectedStr = printExpected(expectedMessage);
      const receivedStr = printReceived(queue.sentMessages);
      return `${hint}
      
      Expected message to be in queue:
        ${expectedStr}
      Received:
        ${receivedStr}`;
    },
  };
};
