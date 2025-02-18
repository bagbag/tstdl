import { assert } from '../type-guards.js';
import { kibibyte, mebibyte } from '../units.js';
import { toBytesStream } from './to-bytes-stream.js';

export function sliceStream(stream: ReadableStream<ArrayBufferView>, offset: number, length: number, type?: 'bytes'): ReadableStream<Uint8Array>;
export function sliceStream<T>(stream: ReadableStream<T>, offset: number, length: number, type: 'chunks'): ReadableStream<T>;
export function sliceStream<T>(stream: ReadableStream<T>, offset: number, length: number, type: 'chunks' | 'bytes' = 'bytes'): ReadableStream<T> {
  assert(length > 0, 'Length must be positive');

  let chunksRead = 0;

  if (type == 'chunks') {
    const reader = stream.getReader();

    return new ReadableStream<T>({
      async pull(controller) {
        while (chunksRead < offset) {
          const result = await reader.read();
          chunksRead++;

          if (result.done) {
            controller.close();
            return;
          }
        }

        if ((chunksRead - offset) == length) {
          await reader.cancel();
          controller.close();
          return;
        }

        const result = await reader.read();
        chunksRead++;

        if (result.done) {
          controller.close();
          return;
        }

        controller.enqueue(result.value);
      },
      async cancel(reason) {
        await reader.cancel(reason);
      }
    });
  }

  const byobReader = toBytesStream(stream as ReadableStream<ArrayBufferView>).getReader({ mode: 'byob' });
  let bytesRead = 0;

  let offsetBuffer: ArrayBuffer | null = new ArrayBuffer(mebibyte);

  return new ReadableStream({
    type: 'bytes',
    autoAllocateChunkSize: 100 * kibibyte,
    async pull(controller) {
      while (bytesRead < offset) {
        const readResult = await byobReader.read(new Uint8Array(offsetBuffer!, 0, Math.min(offsetBuffer!.byteLength, offset - bytesRead)));

        if (readResult.done) {
          controller.close();
          controller.byobRequest!.respond(0);
          return;
        }

        bytesRead += readResult.value.byteLength;

        if (bytesRead == offset) {
          offsetBuffer = null;
        }
      }

      if ((bytesRead - offset) == length) {
        await byobReader.cancel();
        controller.close();
        controller.byobRequest!.respond(0);
        return;
      }

      const view = controller.byobRequest!.view!;
      const readResult = await byobReader.read(new Uint8Array(view.buffer, view.byteOffset, Math.min(view.byteLength, length - (bytesRead - offset))));

      bytesRead += readResult.value!.byteLength;

      if (readResult.done) {
        await byobReader.cancel();
        controller.close();
      }

      controller.byobRequest!.respondWithNewView(readResult.value!);
    },
    async cancel(reason) {
      await byobReader.cancel(reason);
    }
  }) as ReadableStream<T>;
}
