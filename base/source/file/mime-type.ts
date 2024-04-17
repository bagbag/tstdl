import { dynamicImport } from '#/import.js';
import { decodeTextStream } from '#/utils/encoding.js';
import { readTextStream } from '#/utils/stream/stream-reader.js';
import { isUint8Array } from '#/utils/type-guards.js';

export async function getMimeType(file: Uint8Array | ReadableStream<Uint8Array>): Promise<string> {
  return spawnFileCommand(['--brief', '--mime-type', '-'], file);
}

export async function getMimeTypeExtensions(file: Uint8Array | ReadableStream<Uint8Array>): Promise<string | null> {
  const extensions = await spawnFileCommand(['--brief', '--extension', '-'], file);
  const indexOfSlash = extensions.indexOf('/');

  const extension = (indexOfSlash > 0) ? extensions.slice(0, indexOfSlash) : extensions;

  if (extension == '???') {
    return null;
  }

  return extension;
}

async function spawnFileCommand(args: string[], file: Uint8Array | ReadableStream<Uint8Array>): Promise<string> {
  const { spawn } = await dynamicImport<typeof import('node:child_process')>('node:child_process');
  const { Readable, Writable } = await dynamicImport<typeof import('node:stream')>('node:stream');

  const process = spawn('file', args, { stdio: 'pipe' });

  const stdin = Writable.toWeb(process.stdin);
  const stdout = (Readable.toWeb(process.stdout) as ReadableStream<Uint8Array>).pipeThrough(decodeTextStream());

  if (isUint8Array(file)) {
    const writer = stdin.getWriter();
    try {
      await writer.write(file);
      await writer.close();
    }
    catch { /* File command closes stream as soon as it has the required data */ }
  }
  else {
    await file.pipeTo(stdin);
  }

  const output = await readTextStream(stdout);
  return output.trim();
}
