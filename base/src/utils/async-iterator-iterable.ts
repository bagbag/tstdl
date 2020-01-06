export class AsyncIteratorIterable<T> implements AsyncIterable<T> {
  private readonly iterator: AsyncIterator<T>;
  private readonly keepOpen: boolean;

  constructor(iterator: AsyncIterator<T>, keepOpen: boolean = false) {
    this.iterator = iterator;
    this.keepOpen = keepOpen;
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
        catch (error) {
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
