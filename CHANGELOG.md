# Changelog

## v1.2.2

### Added

- 5 new matchers: `toHaveReceived`, `toHaveBeenAcked`, `toHaveQueueSize`, `toHaveOnlyTypes`, `toHavePublishedTimes`
- `MessageQueueAdapter<T>` interface, structural contract for broker ports; keeps `jest-mq` out of production imports
- `peek(type?)` on `MessageQueue<T>`, reads without consuming
- `expectMessage({ queue, messageType, timeout? })` exported from package root
- Dedicated `ackedMessages` list, enables `toHaveBeenAcked` to distinguish explicit acks from `autoAck`

### Changed

- `getQueue()` return type now includes `ackedMessages`
- `clear()` now resets `ackedMessages`
- `.DS_Store` added to `.gitignore`

## v1.0.0

- Added handler tracking and async-safe dispatch in `MessageQueue`.
- Added `flush()` to await handlers and surface handler errors.
- Added local quality gate scripts and updated tests/snapshots.
