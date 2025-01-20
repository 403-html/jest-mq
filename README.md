# jest-mq

![status](https://img.shields.io/badge/status-development-blue)
![node](https://img.shields.io/badge/node-v23.6.0-red)

> Don't use this library yet. It's still in development. Check back later for a stable release.

`jest-mq` is a testing utility for mocking and asserting message queue interactions in your Jest tests. It simplifies the process of testing code that relies on message queues by providing easy-to-use mock implementations and assertion helpers.

## Installation

```sh
npm install jest-mq --save-dev
```

## Simple Example

Here's a simple example to get you started:

```javascript
import "jest-mq/matchers";
const { MessageQueue } = require('jest-mq');

test('should send and receive a message', async () => {
  const queue = new MessageQueue('test-queue');

  queue.sendMessage({ message: 'Hello, World!' });

  const message = queue.receiveMessage();
  expect(message).toEqual({ message: 'Hello, World!', type: undefined, id: 0 });
  expect(queue).toHaveEmptyQueue();
});
```

More examples like using it with NestJS or Express can be found in the [wiki](https://github.com/403-html/wiki)

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
