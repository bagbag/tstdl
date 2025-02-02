import { spawnCommand } from '#/process/spawn.js';
import { isDefined, isString } from '#/utils/type-guards.js';
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
  const process = await spawnCommand('file', args, { stdinPipeOptions: { preventCancel: true } });

  if (isDefined(file)) {
    await process.write(file);
  }

  const { code } = await process.wait();

  if (code != 0) {
    const errorOutput = await process.readError();
    throw new Error(errorOutput.trim());
  }

  const output = await process.readOutput();

  if (output.includes('file or directory')) {
    throw new Error(output.trim());
  }

  return output.trim();
}
