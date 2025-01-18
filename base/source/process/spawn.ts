import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { dynamicImport } from '#/import.js';
import { decodeTextStream, encodeUtf8Stream } from '#/utils/encoding.js';
import { readBinaryStream, readTextStream } from '#/utils/stream/stream-reader.js';

import { toReadableStream } from '#/utils/stream/to-readable-stream.js';
import { isReadableStream, isString, isUint8Array } from '#/utils/type-guards.js';

export type SpawnCommandResult = TransformStream<Uint8Array, Uint8Array> & {
  process: ChildProcessWithoutNullStreams,
  stderr: ReadableStream<Uint8Array>,
  write(chunk: ReadableStream<Uint8Array> | Uint8Array | string): Promise<void>,
  readOutputBytes(): Promise<Uint8Array>,
  readOutput(): Promise<string>,
  readErrorBytes(): Promise<Uint8Array>,
  readError(): Promise<string>,
  wait(): Promise<{ code: number | null, signal: string | null }>
};

export async function spawnCommand(command: string, args?: string[], options?: { stdinPipeOptions?: StreamPipeOptions }): Promise<SpawnCommandResult> {
  const { spawn } = await dynamicImport<typeof import('node:child_process')>('node:child_process');
  const { Readable, Writable } = await dynamicImport<typeof import('node:stream')>('node:stream');

  const process = spawn(command, args, { stdio: 'pipe' });

  await Promise.race([
    new Promise((resolve) => process.on('spawn', resolve)),
    new Promise((_, reject) => process.on('error', reject))
  ]);

  const readable = Readable.toWeb(process.stdout) as ReadableStream<Uint8Array>;
  const writable = Writable.toWeb(process.stdin) as WritableStream<Uint8Array>;
  const stderr = Readable.toWeb(process.stderr) as ReadableStream<Uint8Array>;

  async function write(data: ReadableStream<Uint8Array> | Uint8Array | string): Promise<void> {
    if (isReadableStream(data)) {
      await data.pipeTo(writable, options?.stdinPipeOptions);
    }
    else if (isUint8Array(data)) {
      await toReadableStream(data).pipeTo(writable, options?.stdinPipeOptions);
    }
    else if (isString(data)) {
      await toReadableStream(data).pipeThrough(encodeUtf8Stream()).pipeTo(writable, options?.stdinPipeOptions);
    }
  }

  async function readOutputBytes(): Promise<Uint8Array> {
    return readBinaryStream(readable);
  }

  async function readOutput(): Promise<string> {
    return readTextStream(readable.pipeThrough(decodeTextStream()));
  }

  async function readErrBytes(): Promise<Uint8Array> {
    return readBinaryStream(stderr);
  }

  async function readErr(): Promise<string> {
    return readTextStream(stderr.pipeThrough(decodeTextStream()));
  }

  const signalPromise = new Promise<{ code: number | null, signal: string | null }>((resolve) => process.on('close', (code, signal) => resolve({ code, signal })));

  return {
    process,
    readable,
    writable,
    stderr,
    write,
    readOutputBytes,
    readOutput,
    readErrorBytes: readErrBytes,
    readError: readErr,
    async wait() {
      return signalPromise;
    }
  };
}
