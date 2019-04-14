import { zBase32Encode } from '@common-ts/base/utils';
import { randomBytes } from 'crypto';

let index = 0;
let buffer = new Uint8Array();

export async function uniqueId(bufferSize: number): Promise<string> {
  const buffer = await getRandomBytes(bufferSize);
  const id = zBase32Encode(buffer);

  return id;
}

export function uniqueIdSync(bufferSize: number): string {
  const buffer = getRandomBytesSync(bufferSize);
  const id = zBase32Encode(buffer);

  return id;
}

async function getRandomBytes(count: number): Promise<ArrayBuffer> {
  if (count > (buffer.byteLength - index)) {
    buffer = await randomBytesAsync(Math.max(count, 1024));
    index = 0;
  }

  const end = index + count;
  const bytes = buffer.slice(index, end);
  index = end;

  return bytes;
}

function getRandomBytesSync(count: number): ArrayBuffer {
  if (count > (buffer.byteLength - index)) {
    buffer = randomBytes(Math.max(count, 1024));
    index = 0;
  }

  const end = index + count;
  const bytes = buffer.slice(index, end);
  index = end;

  return bytes;
}

async function randomBytesAsync(count: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    randomBytes(count, (error, buffer) => {
      if (error != undefined) {
        reject(error);
        return;
      }

      resolve(buffer);
    })
  });
}
