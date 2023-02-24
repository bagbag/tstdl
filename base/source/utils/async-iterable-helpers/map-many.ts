import type { AnyIterable } from '../any-iterable-iterator.js';
import { isAsyncIterable } from './is-async-iterable.js';
import type { AsyncIteratorFunction } from './types.js';

export function mapManyAsync<TIn, TOut>(iterable: AnyIterable<TIn>, mapper: AsyncIteratorFunction<TIn, AnyIterable<TOut>>): AsyncIterableIterator<TOut> {
  return isAsyncIterable(iterable)
    ? async(iterable, mapper)
    : sync(iterable, mapper);
}

async function* sync<TIn, TOut>(iterable: Iterable<TIn>, mapper: AsyncIteratorFunction<TIn, AnyIterable<TOut>>): AsyncIterableIterator<TOut> {
  let index = 0;

  for (const item of iterable) {
    let mapped = mapper(item, index++);

    if (mapped instanceof Promise) {
      mapped = await mapped;
    }

    yield* mapped;
  }
}

async function* async<TIn, TOut>(iterable: AsyncIterable<TIn>, mapper: AsyncIteratorFunction<TIn, AnyIterable<TOut>>): AsyncIterableIterator<TOut> {
  let index = 0;

  for await (const item of iterable) {
    let mapped = mapper(item, index++);

    if (mapped instanceof Promise) {
      mapped = await mapped;
    }

    yield* mapped;
  }
}
