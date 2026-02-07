import { MessageQueue, type MessagePayload } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toBeInQueue = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expectedMessage: MessagePayload,
) {
  const queue = received.getQueue(false);
  const messageIsInQueue = queue.sentMessages.some((message) => {
    const rest = (({
      id: _id,
      attempts: _attempts,
      redelivered: _redelivered,
      ...remaining
    }) => remaining)(message);
    return this.equals(
      // Exclude id from comparison, it's provided by the queue
      rest,
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
