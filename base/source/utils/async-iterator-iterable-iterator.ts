import { assertDefined } from './type-guards.js';

interface FullyTypedAsyncIterableIterator<T, TReturn = any, TNext = undefined> extends AsyncIterator<T, TReturn, TNext> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

export class AsyncIteratorIterableIterator<T, TReturn = any, TNext = undefined> implements FullyTypedAsyncIterableIterator<T, TReturn, TNext> {
  private readonly iterator: AsyncIterator<T, TReturn, TNext>;
  private readonly keepOpen: boolean;

  constructor(iterator: AsyncIterator<T, TReturn, TNext>, keepOpen: boolean = false) {
    this.iterator = iterator;
    this.keepOpen = keepOpen;
  }

  async next(...args: [] | [TNext]): Promise<IteratorResult<T, TReturn>> {
    return this.iterator.next(...args);
  }

  async return(value?: TReturn | PromiseLike<TReturn>): Promise<IteratorResult<T, TReturn>> {
    assertDefined(this.iterator.return, 'underlying iterator has no return function defined');
    return this.iterator.return(value);
  }

  async throw(error?: any): Promise<IteratorResult<T, TReturn>> {
    assertDefined(this.iterator.throw, 'underlying iterator has no throw function defined');
    return this.iterator.throw(error);
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    let finished = false;

    try {
      while (true) {
        const result = await this.iterator.next();

        if (result.done == true) {
          finished = true;
          return;
        }

        try {
          yield result.value;
        }
        catch (error: unknown) {
          if (this.iterator.throw != undefined) {
            await this.iterator.throw(error);
          }
        }
      }
    }
    finally {
      if (!finished && !this.keepOpen && this.iterator.return != undefined) {
        await this.iterator.return();
      }
    }
  }
}
