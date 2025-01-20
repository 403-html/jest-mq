# Contributing to jest-mq

Contributions are welcome! Please follow the guidelines below to contribute to this project.

## Table of Contents

- [Contributing to jest-mq](#contributing-to-jest-mq)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Contributing](#contributing)
  - [Development](#development)
  - [License](#license)

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [issues](https://github.com/403-html/jest-mq/issues).

## Contributing

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes
4. Write tests for your changes (if applicable)
5. Run the tests (`npm run test`)
6. Commit your changes
7. Create a pull request

## Development

To get started with development, clone the repository and install the dependencies:

```sh
git clone [repository-url]
cd jest-mq
npm install
```

To run the tests:

```sh
npm run test
```

To build the project:

```sh
npm run build
```

Project is divided into three main parts:

- `src/core` contains the core functionality of the library (like the `MessageQueue` class, or `helpers`).
- `src/matchers` contains Jest matchers for the library.
- `src/__tests__` contains tests for the library and matchers.

Please make sure to write tests for your changes and run the tests before creating a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
