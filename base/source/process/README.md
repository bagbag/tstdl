# Process (`@tstdl/base/process`)

Provides a modern, promise- and stream-based wrapper for spawning child processes, built on the Web Streams API.

## Table of Contents

- [Features](#features)
- [Core Concepts](#core-concepts)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Writing Data to a Process](#writing-data-to-a-process)
  - [Piping Between Processes](#piping-between-processes)
  - [Error Handling](#error-handling)
- [API Summary](#api-summary)

## Features

- Wraps Node.js `child_process` with a modern async/await and Web Streams API.
- Provides `stdin` as a `WritableStream` and `stdout` as a `ReadableStream`.
- Promise-based `wait()` method for gracefully handling process termination.
- Automatic and configurable error throwing for non-zero exit codes.
- Convenient helper methods to read `stdout` and `stderr` as strings or byte arrays.
- Seamlessly pipe data from and to other stream-based APIs.

## Core Concepts

The `spawnCommand` function is the main export of this module. It is designed to simplify interactions with external command-line tools by leveraging modern JavaScript features.

When you call `spawnCommand`, it returns a `SpawnCommandResult` object. This object is a `TransformStream` where the `readable` side is the process's `stdout` and the `writable` side is the process's `stdin`. This elegant design allows you to pipe data from and to other stream-based APIs seamlessly.

In addition to being a stream, the `SpawnCommandResult` object is augmented with several helper properties and methods:

- **`stderr` Stream:** A separate `ReadableStream` for the process's standard error output.
- **Helper Methods:** Functions to easily write data to `stdin` (accepting `string`, `Uint8Array`, or another `ReadableStream`) and to consume `stdout` or `stderr` completely into a string or byte array.
- **Lifecycle Management:** A promise-based `wait()` method to asynchronously wait for the process to complete. It includes built-in error handling for non-zero exit codes, which simplifies checking for successful execution.
- **`process` Property:** Direct access to the underlying Node.js `ChildProcess` instance for advanced use cases.

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

### Writing Data to a Process

You can easily write data to the process's `stdin` from a string, `Uint8Array`, or another stream. The `write()` method handles stream creation and closing automatically.

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

### Piping Between Processes

The stream-based nature of the API makes it trivial to pipe the output of one command directly into the input of another.

```typescript
import { spawnCommand } from '@tstdl/base/process';

// Pipe the output of `ls -la` into `grep .ts`
const ls = await spawnCommand('ls', ['-la']);
const grep = await spawnCommand('grep', ['.ts']);

// Pipe ls's stdout to grep's stdin
await ls.readable.pipeTo(grep.writable);

// Read the final output from grep
const grepOutput = await grep.readOutput();
console.log(grepOutput);

// Wait for both processes to complete
const [lsResult, grepResult] = await Promise.all([ls.wait(), grep.wait()]);
console.log(`ls exited with ${lsResult.code}, grep exited with ${grepResult.code}`);
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
  console.error((error as Error).message); // "cat: non-existent-file.txt: No such file or directory"
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

The module exports a single main function, `spawnCommand`.

| Function       | Arguments                            | Returns                       | Description                 |
| :------------- | :----------------------------------- | :---------------------------- | :-------------------------- |
| `spawnCommand` | `command: string`, `args?: string[]` | `Promise<SpawnCommandResult>` | Spawns a new child process. |

### `SpawnCommandResult`

An object returned by `spawnCommand`. It is a `TransformStream` augmented with the following properties and methods:

| Property / Method         | Type / Signature                                                                                                | Description                                                                                                          |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `process`                 | `ChildProcessWithoutNullStreams`                                                                                | The underlying Node.js `ChildProcess` instance.                                                                      |
| `readable`                | `ReadableStream<Uint8Array>`                                                                                    | A `ReadableStream` for the process's `stdout`. (Inherited from `TransformStream`)                                    |
| `writable`                | `WritableStream<Uint8Array>`                                                                                    | A `WritableStream` for the process's `stdin`. (Inherited from `TransformStream`)                                     |
| `stderr`                  | `ReadableStream<Uint8Array>`                                                                                    | A `ReadableStream` for the process's `stderr`.                                                                       |
| `write()`                 | `(chunk: ReadableStream \| Uint8Array \| string, options?: StreamPipeOptions) => Promise<void>`                 | Asynchronously writes data to `stdin`. Automatically encodes strings and closes the stream upon completion.        |
| `autoWrite()`             | `(chunk: ReadableStream \| Uint8Array \| string, options?: StreamPipeOptions) => void`                          | Writes data to `stdin` without awaiting completion (fire-and-forget). Useful for non-blocking writes.                |
| `readOutputBytes()`       | `() => Promise<Uint8Array>`                                                                                     | Reads the entire `stdout` stream and returns the result as a `Uint8Array`.                                           |
| `readOutput()`            | `() => Promise<string>`                                                                                         | Reads the entire `stdout` stream and returns it as a UTF-8 decoded string.                                           |
| `readErrorBytes()`        | `() => Promise<Uint8Array>`                                                                                     | Reads the entire `stderr` stream and returns the result as a `Uint8Array`.                                           |
| `readError()`             | `() => Promise<string>`                                                                                         | Reads the entire `stderr` stream and returns it as a UTF-8 decoded string.                                           |
| `handleNonZeroExitCode()` | `() => void`                                                                                                    | Manually checks the process's exit code. If non-zero, it cancels the I/O streams with the corresponding error.       |
| `wait()`                  | `(options?: { throwOnNonZeroExitCode?: boolean }) => Promise<{ code: number \| null, signal: string \| null }>` | Waits for the process to exit. Throws an error by default if the exit code is non-zero.                              |