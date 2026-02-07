import { Message, MessageQueue, type MessagePayload } from "./queue";

/**
 * Waits asynchronously for a specific type of message from the given message queue within a specified timeout period.
 *
 * @template T - The type of the message.
 * @param {Object} params - The parameters for the function.
 * @param {MessageQueue<T>} params.queue - The message queue to receive messages from.
 * @param {string} params.messageType - The type of message to wait for.
 * @param {number} [params.timeout=3000] - The maximum time to wait for the message, in milliseconds. Defaults to 3000 ms.
 * @returns {Promise<Message<T>>} A promise that resolves with the received message if it arrives within the timeout period, or rejects with an error if the timeout is reached.
 * @throws {Error} If the timeout is reached before a message of the specified type is received.
 */
export async function expectMessage<T extends MessagePayload = MessagePayload>({
  queue,
  messageType,
  timeout = 3000,
}: {
  queue: MessageQueue<T>;
  messageType: string;
  timeout?: number;
}): Promise<Message<T>> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const message = queue.receiveMessage(messageType);
      if (message) {
        clearInterval(intervalId);
        resolve(message);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(intervalId);
        reject(new Error(`Timeout waiting for message type: ${messageType}`));
      }
    }, 10);
  });
}
