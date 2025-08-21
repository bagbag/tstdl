import { isNotNull, isNull } from '../type-guards.js';
import { kibibyte } from '../units.js';

export type ToBytesStreamOptions = {
  ignoreCancel?: boolean,
};

export function toBytesStream(stream: ReadableStream<ArrayBufferView<ArrayBuffer>>, options?: ToBytesStreamOptions): ReadableStream<Uint8Array> {
  try { // Try to use byob mode from source
    let byobReader: ReadableStreamBYOBReader;

    return new ReadableStream({
      type: 'bytes',
      autoAllocateChunkSize: 100 * kibibyte,
      start() {
        byobReader = stream.getReader({ mode: 'byob' });
      },
      async pull(controller) {
        const readResult = await byobReader.read(controller.byobRequest!.view!);

        if (readResult.done) {
          controller.close();
        }

        controller.byobRequest!.respondWithNewView(readResult.value!);
      },
      async cancel(reason) {
        if (options?.ignoreCancel == true) {
          byobReader.releaseLock();
        }
        else {
          await byobReader.cancel(reason);
        }
      },
    });
  }
  catch { /* Ignore */ }

  let reader: ReadableStreamDefaultReader<ArrayBufferView<ArrayBuffer>>;
  let buffer: ArrayBufferView<ArrayBuffer> | null = null;

  return new ReadableStream({
    type: 'bytes',
    start() {
      reader = stream.getReader();
    },
    async pull(controller) {
      const isByobRequest = isNotNull(controller.byobRequest);
      const bufferIsEmpty = isNull(buffer) || (buffer.byteLength == 0);

      if (!isByobRequest && !bufferIsEmpty) {
        // We still have data left in buffer from previous pull which was byob
        controller.enqueue(buffer!);
        buffer = null;
        return;
      }

      if (bufferIsEmpty) {
        const readResult = await reader.read();

        if (readResult.done) {
          controller.close();
          controller.byobRequest?.respond(0);
          return;
        }

        buffer = readResult.value;
      }

      if (!isByobRequest) {
        controller.enqueue(buffer!);
        buffer = null;
        return;
      }

      const targetView = controller.byobRequest.view!;
      const targetArray = new Uint8Array(targetView.buffer, targetView.byteOffset, targetView.byteLength);

      const setLength = Math.min(buffer!.byteLength, targetArray.byteLength);
      const sourceArray = new Uint8Array(buffer!.buffer, buffer!.byteOffset, setLength);

      targetArray.set(sourceArray);

      buffer = new Uint8Array(buffer!.buffer, buffer!.byteOffset + setLength);

      controller.byobRequest.respond(setLength);
    },
    async cancel(reason) {
      if (options?.ignoreCancel == true) {
        reader.releaseLock();
      }
      else {
        await reader.cancel(reason);
      }
    },
  });
}
