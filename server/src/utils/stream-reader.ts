import { NonObjectBufferMode } from './stream-helper-types';
import { TypedReadable } from './typed-readable';

export async function readStream(readable: TypedReadable<NonObjectBufferMode>, maxBytes?: number): Promise<Buffer> {
  let totalLength = 0;
  const chunks: Buffer[] = [];

  for await (const chunk of readable) {
    chunks.push(chunk);
    totalLength += chunk.length;

    if (maxBytes != undefined && totalLength > maxBytes) {
      readable.destroy(new Error(`maximum size of ${maxBytes} bytes exceeded`));
    }
  }

  const buffer = Buffer.concat(chunks, totalLength);
  return buffer;
}
