import type { TypedOmit } from '#/types';
import type { ReadableOptions } from 'stream';
import { Readable } from 'stream';
import { isNotNull } from '../type-guards';

export class AsyncIterableReadable extends Readable {
  private readonly iterable: AsyncIterable<Uint8Array>;

  private iterator: AsyncIterator<Uint8Array>;

  constructor(iterable: AsyncIterable<Uint8Array>, options?: TypedOmit<ReadableOptions, 'objectMode'>) {
    super(options);

    this.iterable = iterable;
  }

  override _construct(callback: (error?: Error | null) => void): void {
    this.iterator = this.iterable[Symbol.asyncIterator]();
    callback();
  }

  override async _read(): Promise<void> {
    const next = await this.iterator.next();

    if (next.done == true) {
      this.push(null);
      return;
    }

    this.push(next.value);
  }

  override async _destroy(error: Error | null, callback: (error?: Error | null) => void): Promise<void> {
    try {
      if (isNotNull(error)) {
        await this.iterator.throw?.(error);
      }
      else {
        await this.iterator.return?.();
      }

      callback(error);
    }
    catch (iteratorError) {
      callback(iteratorError as Error);
    }
  }
}
