import { MessageQueue } from "../core/queue";
import { matcherHint, printReceived, printExpected } from "jest-matcher-utils";

export const toHaveOnlyTypes = function (
  this: jest.MatcherContext,
  received: MessageQueue<any>,
  expectedTypes: string[],
) {
  const queue = received.getQueue();
  const allMessages = [...queue.sentMessages, ...queue.receivedMessages];
  const unexpectedTypes = allMessages
    .map((message) => message.type)
    .filter((type) => !expectedTypes.includes(type ?? ""));
  const pass = unexpectedTypes.length === 0;

  return {
    pass,
    message: () => {
      const hint = matcherHint(".toHaveOnlyTypes", "received", "expectedTypes");
      const expectedStr = printExpected(expectedTypes);
      const receivedStr = printReceived(
        allMessages.map((message) => message.type),
      );
      return `${hint}
      
      Expected only message types:
        ${expectedStr}
      Received types:
        ${receivedStr}`;
    },
  };
};
