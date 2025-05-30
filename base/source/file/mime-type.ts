import { fileTypeFromBuffer, fileTypeFromFile, fileTypeFromStream } from 'file-type/node';

import { isReadableStream, isString, isUint8Array } from '#/utils/type-guards.js';
import { match } from 'ts-pattern';
import { mimeTypesMap } from './mime-types.js';

export async function getMimeType(file: string | Uint8Array | ReadableStream<Uint8Array>): Promise<string | undefined>;
export async function getMimeType<F>(file: string | Uint8Array | ReadableStream<Uint8Array>, fallback: F): Promise<string | F>;
export async function getMimeType<F>(file: string | Uint8Array | ReadableStream<Uint8Array>, fallback?: F): Promise<string | F> {
  const result = await match(file)
    .when(isString, async (f) => await fileTypeFromFile(f))
    .when(isUint8Array, async (f) => await fileTypeFromBuffer(f))
    .when(isReadableStream<Uint8Array>, async (f) => await fileTypeFromStream(f))
    .exhaustive();

  return result?.mime ?? fallback!;
}

export function getMimeTypeExtensions(mimeType: string): string[] {
  return mimeTypesMap.get(mimeType) ?? [];
}
