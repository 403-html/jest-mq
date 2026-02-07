import { MessageQueue } from "../core/queue";
import { matcherHint, printExpected, printReceived } from "jest-matcher-utils";

export const toHaveInFlightCount = function (
  this: jest.MatcherContext,
  received: MessageQueue,
  expected: number,
) {
  const actual = received.inFlightCount();
  const pass = actual === expected;

  return {
    pass,
    message: () => {
      const hint = matcherHint(".toHaveInFlightCount", "received", "expected");
      return `${hint}
      
      Expected in-flight count:
        ${printExpected(expected)}
      Received:
        ${printReceived(actual)}`;
    },
  };
};
