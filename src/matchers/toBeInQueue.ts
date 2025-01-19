import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toBeInQueue = function (
  this: jest.MatcherContext,
  received: MessageQueue<any>,
  expectedMessage: any,
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
      const receivedStr = printReceived(expectedMessage);
      const expectedStr = printExpected(queue.sentMessages);
      return `${hint}
      
      Expected message to be in queue:
        ${receivedStr}
      Received:
        ${expectedStr}`;
    },
  };
};
