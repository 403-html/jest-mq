import { MessageQueue } from "../core/queue";
import { matcherHint, printExpected, printReceived } from "jest-matcher-utils";

export const toHaveAckedCount = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expected: number,
) {
  const actual = received.ackedCount();
  const pass = actual === expected;

  return {
    pass,
    message: () => {
      const hint = matcherHint(".toHaveAckedCount", "received", "expected");
      return `${hint}
      
      Expected acked count:
        ${printExpected(expected)}
      Received:
        ${printReceived(actual)}`;
    },
  };
};
