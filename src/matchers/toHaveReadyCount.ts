import { MessageQueue } from "../core/queue";
import { matcherHint, printExpected, printReceived } from "jest-matcher-utils";

export const toHaveReadyCount = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expected: number,
) {
  const actual = received.readyCount();
  const pass = actual === expected;

  return {
    pass,
    message: () => {
      const hint = matcherHint(".toHaveReadyCount", "received", "expected");
      return `${hint}
      
      Expected ready count:
        ${printExpected(expected)}
      Received:
        ${printReceived(actual)}`;
    },
  };
};
