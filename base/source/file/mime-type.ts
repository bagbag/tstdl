import { dynamicImport } from '#/import.js';
import { decodeTextStream } from '#/utils/encoding.js';
import { readTextStream } from '#/utils/stream/stream-reader.js';
import { isReadableStream, isString, isUint8Array } from '#/utils/type-guards.js';
import { mimeTypesMap } from './mime-types.js';

export async function getMimeType(file: string | Uint8Array | ReadableStream<Uint8Array>): Promise<string> {
  const path = isString(file) ? file : '-';
  const data = isString(file) ? undefined : file;

  return spawnFileCommand(['--brief', '--mime-type', path], data);
}

export function getMimeTypeExtensions(mimeType: string): string[] {
  return mimeTypesMap.get(mimeType) ?? [];
}

async function spawnFileCommand(args: string[], file?: Uint8Array | ReadableStream<Uint8Array>): Promise<string> {
  const { spawn } = await dynamicImport<typeof import('node:child_process')>('node:child_process');
  const { Readable, Writable } = await dynamicImport<typeof import('node:stream')>('node:stream');

  const process = spawn('file', args, { stdio: 'pipe' });

  const stdin = Writable.toWeb(process.stdin);
  const stdout = (Readable.toWeb(process.stdout) as ReadableStream<Uint8Array>).pipeThrough(decodeTextStream());

  if (isReadableStream(file)) {
    await file.pipeTo(stdin);
  }
  else if (isUint8Array(file)) {
    const writer = stdin.getWriter();
    try {
      await writer.write(file);
      await writer.close();
    }
    catch { /* File command closes stream as soon as it has the required data */ }
  }

  const output = await readTextStream(stdout);
  return output.trim();
}
