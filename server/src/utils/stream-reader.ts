import { TypedReadable } from './typed-readable';
import { NonObjectBufferMode } from './stream-helper-types';

export async function readStream(readable: TypedReadable<NonObjectBufferMode>, maxBytes?: number): Promise<Buffer> {
  let totalLength: number = 0;
  const chunks: Buffer[] = [];

  for await (const chunk of readable) { // tslint:disable-line: await-promise
    chunks.push(chunk);
    totalLength += chunk.length;

    if (maxBytes != undefined && totalLength >= maxBytes) {
      readable.destroy(new Error(`maximum size of ${maxBytes} bytes exceeded`));
    }
  }

  const buffer = Buffer.concat(chunks, totalLength);
  return buffer;
}
