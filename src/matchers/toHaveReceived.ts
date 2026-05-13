import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toHaveReceived = function (
  this: jest.MatcherContext,
  received: MessageQueue<any>,
  expectedMessage: any,
) {
  const queue = received.getQueue();
  const wasReceived = queue.receivedMessages.some((message) =>
    this.equals(
      { ...message, id: undefined },
      expectedMessage,
    ),
  );

  return {
    pass: wasReceived,
    message: () => {
      const hint = matcherHint(".toHaveReceived", "received", "expectedMessage");
      const expectedStr = printReceived(expectedMessage);
      const receivedStr = printExpected(queue.receivedMessages);
      return `${hint}
      
      Expected message to be received:
        ${expectedStr}
      Received messages:
        ${receivedStr}`;
    },
  };
};
