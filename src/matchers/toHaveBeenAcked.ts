import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toHaveBeenAcked = function (
  this: jest.MatcherContext,
  received: MessageQueue<any>,
  expectedMessage: any,
) {
  const queue = received.getQueue();
  const wasAcked = queue.ackedMessages.some((message) =>
    this.equals({ ...message, id: undefined }, expectedMessage),
  );

  return {
    pass: wasAcked,
    message: () => {
      const hint = matcherHint(
        ".toHaveBeenAcked",
        "received",
        "expectedMessage",
      );
      const expectedStr = printReceived(expectedMessage);
      const receivedStr = printExpected(queue.ackedMessages);
      return `${hint}

      Expected message to be acked:
        ${expectedStr}
      Acked messages:
        ${receivedStr}`;
    },
  };
};
