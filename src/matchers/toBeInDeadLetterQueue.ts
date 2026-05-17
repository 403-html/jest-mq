import { MessageQueue, type MessagePayload } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toBeInDeadLetterQueue = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expectedMessage: MessagePayload,
) {
  const queue = received.getQueue();
  const messageIsInDLQ = queue.deadLetterMessages.some((message) =>
    this.equals({ ...message, id: undefined }, expectedMessage),
  );

  return {
    pass: messageIsInDLQ,
    message: () => {
      const hint = matcherHint(
        ".toBeInDeadLetterQueue",
        "received",
        "expectedMessage",
      );
      const expectedStr = printExpected(expectedMessage);
      const receivedStr = printReceived(queue.deadLetterMessages);
      return `${hint}

      Expected message to be in dead letter queue:
        ${expectedStr}
      Received:
        ${receivedStr}`;
    },
  };
};
