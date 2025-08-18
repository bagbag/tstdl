import { create as createDiffPatch } from 'jsondiffpatch';

import { createErrorResponse } from '#/api/index.js';
import type { AnyIterable } from '#/utils/any-iterable-iterator.js';
import { tryIgnoreAsync } from '#/utils/try-ignore.js';
import { isDefined } from '#/utils/type-guards.js';
import { ServerSentEventsSource } from './server-sent-events-source.js';

export type DataStreamSourceOptions = {
  /**
   * Whether to send deltas (the changes) between the last and current data or always the full data.
   */
  delta?: boolean,
};

const jsonDiffPatch = createDiffPatch({
  omitRemovedValues: true,
  arrays: {
    detectMove: true,
    includeValueOnMove: false,
  },
  objectHash(item, index) {
    return ((item as Record<string, unknown>)['id'] as string | undefined) ?? String(index);
  },
});

export class DataStreamSource<T> {
  readonly #options: DataStreamSourceOptions;

  readonly eventSource = new ServerSentEventsSource();
  readonly closed = this.eventSource.closed;

  #lastData: T | undefined;

  constructor(options: DataStreamSourceOptions = { delta: true }) {
    this.#options = options;
  }

  static fromIterable<T>(iterable: AnyIterable<T>, options?: DataStreamSourceOptions): DataStreamSource<T> {
    const source = new DataStreamSource<T>(options);

    void (async () => {
      try {
        for await (const data of iterable) {
          if (source.closed()) {
            break;
          }

          await source.send(data);
        }
      }
      catch (error) {
        await tryIgnoreAsync(async () => await source.error(error));
      }
      finally {
        await tryIgnoreAsync(async () => await source.close());
      }
    })();

    return source;
  }

  async send(data: T): Promise<void> {
    if (this.eventSource.closed()) {
      throw new Error('Cannot send data to a closed DataStreamSource connection.');
    }

    if (this.#options.delta && isDefined(this.#lastData)) {
      const delta = jsonDiffPatch.diff(this.#lastData, data);
      await this.eventSource.sendJson({ name: 'delta', data: delta });
    }
    else {
      await this.eventSource.sendJson({ name: 'data', data });
    }

    if (this.#options.delta) {
      this.#lastData = data;
    }
  }

  async close(): Promise<void> {
    await this.eventSource.close();
  }

  async error(error: unknown): Promise<void> {
    await tryIgnoreAsync(async () => await this.eventSource.sendJson({ name: 'error', data: createErrorResponse(error as Error).error }));
    await tryIgnoreAsync(async () => await this.eventSource.close());
  }
}
