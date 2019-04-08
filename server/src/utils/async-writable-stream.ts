import { DeferredPromise } from '@common-ts/base/promise';
import { Writable } from 'stream';

type NonObjectMode = {
  readonly _nonObjectMode: unique symbol
};

export type Data<T> = T extends NonObjectMode ? (string | Buffer | Uint8Array) : (T extends null ? never : T);

export class AsyncWritableStream<T = NonObjectMode> {
  private readonly writable: Writable;
  private readonly drain: DeferredPromise;

  private hasError: boolean;
  private error: Error | undefined;

  constructor(writable: Writable) {
    this.writable = writable;

    this.drain = new DeferredPromise();
    this.hasError = false;
    this.error = undefined;

    this.writable.on('error', (error) => this.handleError(error));
    this.writable.on('drain', () => this.handleDrain());
  }

  async write(data: Data<T>, encoding?: BufferEncoding): Promise<void> {
    this.checkError();

    const canContinue = (encoding != undefined) ? this.writable.write(data, encoding) : this.writable.write(data);

    if (!canContinue) {
      await this.drain;
    }

    this.checkError();
  }

  async end(): Promise<void> {
    this.checkError();

    return new Promise<void>((resolve) => this.writable.end(resolve));
  }

  private checkError(): void {
    if (this.hasError) {
      throw this.error;
    }
  }

  private handleError(error: Error): void {
    this.hasError = true;
    this.error = error;
  }

  private handleDrain(): void {
    this.drain.resolve();
    this.drain.reset();
  }
}
