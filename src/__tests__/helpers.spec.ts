import { expectMessage } from "../core/helpers";
import { MessageQueue, Message } from "../core/queue";

describe("expectMessage", () => {
  let queue: MessageQueue<any>;

  beforeEach(() => {
    queue = new MessageQueue("test");
  });

  it("should resolve with the message if it arrives within the default timeout", async () => {
    const messageType = "testMessage";
    const expectedMessage: Message<any> = {
      type: messageType,
      payload: "testPayload",
    };

    jest.spyOn(queue, "receiveMessage").mockImplementation((type) => {
      if (type === messageType) {
        return expectedMessage;
      }
      return null;
    });

    const message = await expectMessage({ queue, messageType });
    expect(message).toEqual(expectedMessage);
  });

  it("should resolve with the message if it arrives within the timeout, after some time", async () => {
    const messageType = "testMessage";
    const expectedMessage: Message<any> = {
      type: messageType,
      payload: "testPayload",
    };

    jest.spyOn(queue, "receiveMessage").mockReturnValueOnce(null);

    setTimeout(() => {
      jest.spyOn(queue, "receiveMessage").mockReturnValueOnce(expectedMessage);
    }, 100);

    const message = await expectMessage({ queue, messageType, timeout: 200 });
    expect(message).toEqual(expectedMessage);
  });

  it("should reject with an error if the timeout is reached before the message arrives", async () => {
    const messageType = "testMessage";

    jest.spyOn(queue, "receiveMessage").mockReturnValue(null);

    await expect(
      expectMessage({ queue, messageType, timeout: 100 }),
    ).rejects.toThrow(`Timeout waiting for message type: ${messageType}`);
  });

  it("should resolve with the correct message type", async () => {
    const messageType = "testMessage";
    const wrongMessageType = "wrongMessage";
    const expectedMessage: Message<any> = {
      type: messageType,
      payload: "testPayload",
    };

    jest.spyOn(queue, "receiveMessage").mockImplementation((type) => {
      if (type === messageType) {
        return expectedMessage;
      }
      return null;
    });

    const message = await expectMessage({ queue, messageType, timeout: 100 });
    expect(message.type).toBe(messageType);
    expect(message.type).not.toBe(wrongMessageType);
  });
});
