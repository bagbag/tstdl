import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { dynamicImport } from '#/import.js';
import { LazyPromise } from '#/promise/lazy-promise.js';
import { decodeTextStream, encodeUtf8Stream } from '#/utils/encoding.js';
import { readBinaryStream, readTextStream } from '#/utils/stream/stream-reader.js';
import { toReadableStream } from '#/utils/stream/to-readable-stream.js';
import { assertNotNullOrUndefinedPass, isReadableStream, isString, isUint8Array } from '#/utils/type-guards.js';

type WaitOptions = { throwOnNonZeroExitCode?: boolean };

type ProcessResult = { code: number | null, signal: string | null };

export type SpawnCommandResult = TransformStream<Uint8Array, Uint8Array> & {
  process: ChildProcessWithoutNullStreams,
  stderr: ReadableStream<Uint8Array>,
  write(chunk: ReadableStream<Uint8Array> | Uint8Array | string, options?: StreamPipeOptions): Promise<void>,
  autoWrite(chunk: ReadableStream<Uint8Array> | Uint8Array | string, options?: StreamPipeOptions): void,
  readOutputBytes(): Promise<Uint8Array>,
  readOutput(): Promise<string>,
  readErrorBytes(): Promise<Uint8Array>,
  readError(): Promise<string>,
  handleNonZeroExitCode(): void,
  wait(options?: WaitOptions): Promise<ProcessResult>,
};

export async function spawnCommand(command: string, args?: string[]): Promise<SpawnCommandResult> {
  const { spawn } = await dynamicImport<typeof import('node:child_process')>('node:child_process');
  const { Readable, Writable } = await dynamicImport<typeof import('node:stream')>('node:stream');

  const process = spawn(command, args, { stdio: 'pipe' });

  await Promise.race([
    new Promise((resolve) => process.on('spawn', resolve)),
    new Promise((_, reject) => process.on('error', reject)),
  ]);

  const readable = Readable.toWeb(process.stdout) as ReadableStream<Uint8Array>;
  const writable = Writable.toWeb(process.stdin) as WritableStream<Uint8Array>;
  const stderr = Readable.toWeb(process.stderr) as ReadableStream<Uint8Array>;

  async function write(data: ReadableStream<Uint8Array> | Uint8Array | string, options?: StreamPipeOptions): Promise<void> {
    if (isReadableStream(data)) {
      await data.pipeTo(writable, options);
    }
    else if (isUint8Array(data)) {
      await toReadableStream(data).pipeTo(writable, options);
    }
    else if (isString(data)) {
      await toReadableStream(data).pipeThrough(encodeUtf8Stream()).pipeTo(writable, options);
    }
  }

  function autoWrite(data: ReadableStream<Uint8Array> | Uint8Array | string, options?: StreamPipeOptions): void {
    write(data, options).catch((error: unknown) => {
      readable.cancel(error).catch(() => { /* noop */ });
      writable.abort(error).catch(() => { /* noop */ });
    });
  }

  async function readOutputBytes(): Promise<Uint8Array> {
    return readBinaryStream(readable);
  }

  async function readOutput(): Promise<string> {
    return readTextStream(readable.pipeThrough(decodeTextStream()));
  }

  async function readErrorBytes(): Promise<Uint8Array> {
    return readBinaryStream(stderr);
  }

  async function readError(): Promise<string> {
    return readTextStream(stderr.pipeThrough(decodeTextStream()));
  }

  const signalPromise = new Promise<ProcessResult>((resolve) => process.on('close', (code, signal) => resolve({ code, signal })));

  const nonZeroExitCodeError = new LazyPromise(async () => {
    const result = await signalPromise;

    if (result.code != 0) {
      try {
        const errorOutput = await readError();
        return new Error(errorOutput.trim());
      }
      catch {
        return new Error(`Process exited with code ${result.code} and signal ${result.signal}.`);
      }
    }

    return null;
  });

  async function handleNonZeroExitCode(): Promise<void> {
    const error = await nonZeroExitCodeError;

    if (error) {
      await writable.abort(error).catch(() => { /* noop */ });
      await readable.cancel(error).catch(() => { /* noop */ });
    }
  }

  async function wait({ throwOnNonZeroExitCode = true }: WaitOptions = {}): Promise<ProcessResult> {
    const result = await signalPromise;

    const handleNonZeroExitCode = (result.code != 0) && throwOnNonZeroExitCode;

    if (handleNonZeroExitCode) {
      const error = await nonZeroExitCodeError;
      throw assertNotNullOrUndefinedPass(error);
    }

    return result;
  }

  return {
    process,
    readable,
    writable,
    stderr,
    write,
    autoWrite,
    readOutputBytes,
    readOutput,
    readErrorBytes,
    readError,
    handleNonZeroExitCode: () => void handleNonZeroExitCode(),
    wait,
  };
}
