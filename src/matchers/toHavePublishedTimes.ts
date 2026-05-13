import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toHavePublishedTimes = function (
  this: jest.MatcherContext,
  received: MessageQueue<any>,
  expectedMessage: any,
  expectedCount: number,
) {
  const queue = received.getQueue();
  const allMessages = [...queue.sentMessages, ...queue.receivedMessages];
  const matchingCount = allMessages.filter((message) =>
    this.equals({ ...message, id: undefined }, expectedMessage),
  ).length;
  const pass = matchingCount === expectedCount;

  return {
    pass,
    message: () => {
      const hint = matcherHint(
        ".toHavePublishedTimes",
        "received",
        "expectedMessage, expectedCount",
      );
      const expectedStr = printExpected({
        message: expectedMessage,
        times: expectedCount,
      });
      const receivedStr = printReceived({
        message: expectedMessage,
        times: matchingCount,
      });
      const allMessagesStr = printReceived(allMessages);
      return `${hint}
      
      Expected message published times:
        ${expectedStr}
      Received:
        ${receivedStr}
      All messages:
        ${allMessagesStr}`;
    },
  };
};
