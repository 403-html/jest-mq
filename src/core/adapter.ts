export type QueueMessage<T = unknown> = { type?: string } & T;

/**
 * Interface for production broker adapters. `MessageQueue` satisfies this
 * contract structurally and can be used as a drop-in test double.
 *
 * Usage: type your app's broker dependency against `MessageQueueAdapter<T>`,
 * inject a real adapter in production and a `MessageQueue<T>` in tests.
 */
export interface MessageQueueAdapter<T = unknown> {
  name: string;
  connect?(): Promise<void> | void;
  disconnect?(): Promise<void> | void;
  publish(message: T): Promise<number> | number;
  receiveMessage(
    messageType?: string,
    autoAck?: boolean,
  ): Promise<QueueMessage<T> | undefined> | QueueMessage<T> | undefined;
  subscribe(
    messageType: string | undefined,
    handler: (message: T) => Promise<void> | void,
  ): () => void;
  nack?(message: QueueMessage<T>): Promise<void> | void;
}
