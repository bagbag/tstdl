# @tstdl/base/process

Provides a modern, promise- and stream-based wrapper for spawning child processes, built on the Web Streams API.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Piping Data](#piping-data)
  - [Error Handling](#error-handling)
- [API Summary](#api-summary)

## Features

- Wraps Node.js `child_process` with a modern async/await and Web Streams API.
- Provides `stdin`, `stdout`, and `stderr` as `WritableStream` and `ReadableStream`.
- Promise-based `wait()` method for gracefully handling process termination.
- Automatic and configurable error throwing for non-zero exit codes.
- Convenient helper methods to read `stdout` and `stderr` as strings or byte arrays.

## Core Concepts

The `spawnCommand` function is the main export of this module. It is designed to simplify interactions with external command-line tools by leveraging modern JavaScript features.

When you call `spawnCommand`, it returns a `SpawnCommandResult` object. This object is not the process itself, but a controller that provides:

- **Streams:** Web-compatible streams for `stdin` (`writable`), `stdout` (`readable`), and `stderr`. This allows you to pipe data from and to other stream-based APIs seamlessly.
- **Helper Methods:** Functions to easily write data to `stdin` (accepting `string`, `Uint8Array`, or another `ReadableStream`) and to consume `stdout` or `stderr` completely into a string or byte array.
- **Lifecycle Management:** A promise-based `wait()` method to asynchronously wait for the process to complete. It includes built-in error handling for non-zero exit codes, which simplifies checking for successful execution.

## Usage

### Basic Usage

The simplest use case is to run a command, wait for it to finish, and read its output.

```typescript
import { spawnCommand } from '@tstdl/base/process';

// Spawn 'ls -la' and read its output
const command = await spawnCommand('ls', ['-la']);
const output = await command.readOutput();

console.log(output);

// Wait for the process to finish and get its exit code
const { code } = await command.wait();
console.log(`Process exited with code ${code}`);
```

### Piping Data

You can easily write data to the process's `stdin` and read from its `stdout`. The `write()` method handles stream creation and closing automatically.

```typescript
import { spawnCommand } from '@tstdl/base/process';

// Use 'grep' to find a line in a string
const command = await spawnCommand('grep', ['world']);

// Write a multi-line string to the process's stdin.
// The `write` method automatically closes stdin when it's done.
await command.write('hello\nthis is the world\ngoodbye');

// Read the matched line from stdout
const output = await command.readOutput();
console.log(output); // "this is the world\n"

const { code } = await command.wait();
console.log(`Process exited with code ${code}`); // 0
```

### Error Handling

By default, the `wait()` method throws an error if the process exits with a non-zero status code. The error message will contain the content of `stderr`.

```typescript
import { spawnCommand } from '@tstdl/base/process';

try {
  // Spawn a command that will fail
  const command = await spawnCommand('cat', ['non-existent-file.txt']);

  // wait() throws by default on non-zero exit codes
  await command.wait();
} catch (error) {
  // The error message is populated from stderr
  console.error(error.message); // "cat: non-existent-file.txt: No such file or directory"
}
```

You can disable this behavior and handle errors manually if needed.

```typescript
import { spawnCommand } from '@tstdl/base/process';

// To handle errors manually, disable the automatic throw
const command = await spawnCommand('cat', ['non-existent-file.txt']);
const { code } = await command.wait({ throwOnNonZeroExitCode: false });

if (code !== 0) {
  const stderrOutput = await command.readError();
  console.error(`Process failed with code ${code}:\n${stderrOutput}`);
}
```

## API Summary

### `spawnCommand(command: string, args?: string[]): Promise<SpawnCommandResult>`

Spawns a new child process.

- **`command`**: The command to run.
- **`args`**: A list of string arguments.
- **Returns**: A `Promise` that resolves with a `SpawnCommandResult` object.

### `SpawnCommandResult`

An object returned by `spawnCommand` with the following properties and methods:

- **`process: ChildProcessWithoutNullStreams`**
  The underlying Node.js `ChildProcess` instance.

- **`readable: ReadableStream<Uint8Array>`**
  A `ReadableStream` for the process's `stdout`.

- **`writable: WritableStream<Uint8Array>`**
  A `WritableStream` for the process's `stdin`.

- **`stderr: ReadableStream<Uint8Array>`**
  A `ReadableStream` for the process's `stderr`.

- **`write(chunk: ReadableStream<Uint8Array> | Uint8Array | string, options?: StreamPipeOptions): Promise<void>`**
  Asynchronously writes a chunk of data to `stdin`. Automatically handles encoding for strings and closing the stream.

- **`autoWrite(chunk: ReadableStream<Uint8Array> | Uint8Array | string, options?: StreamPipeOptions): void`**
  Writes data to `stdin` without awaiting completion (fire-and-forget). Useful for non-blocking writes.

- **`readOutputBytes(): Promise<Uint8Array>`**
  Reads the entire `stdout` stream and returns the result as a `Uint8Array`.

- **`readOutput(): Promise<string>`**
  Reads the entire `stdout` stream and returns it as a UTF-8 decoded string.

- **`readErrorBytes(): Promise<Uint8Array>`**
  Reads the entire `stderr` stream and returns the result as a `Uint8Array`.

- **`readError(): Promise<string>`**
  Reads the entire `stderr` stream and returns it as a UTF-8 decoded string.

- **`handleNonZeroExitCode(): void`**
  Manually triggers the non-zero exit code error handling, which may cancel the I/O streams.

- **`wait(options?: WaitOptions): Promise<ProcessResult>`**
  Waits for the process to exit.
  - `options.throwOnNonZeroExitCode: boolean` (default: `true`): If `true`, throws an error if the process exits with a non-zero code.
  - Returns a `Promise` that resolves to a `ProcessResult` object: `{ code: number | null, signal: string | null }`.
