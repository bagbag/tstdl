import { AnyIterable } from '../any-iterable-iterator';
import { isAsyncIterable } from './is-async-iterable';
import { AsyncReducer } from './types';

export function reduceAsync<T>(iterable: AnyIterable<T>, reducer: AsyncReducer<T, T>): Promise<T>;
export function reduceAsync<T, U>(iterable: AnyIterable<T>, reducer: AsyncReducer<T, U>, initialValue?: U): Promise<U>;
export function reduceAsync<T, U>(iterable: AnyIterable<T>, reducer: AsyncReducer<T, U>, initialValue?: U): Promise<U> { // eslint-disable-line @typescript-eslint/promise-function-async
  return (isAsyncIterable(iterable))
    ? async(iterable, reducer, initialValue)
    : sync(iterable, reducer, initialValue);
}

async function sync<T, U>(iterable: Iterable<T>, reducer: AsyncReducer<T, U>, initialValue?: U): Promise<U> {
  let accumulator: T | U | undefined = initialValue;
  let index = 0;

  for (const currentValue of iterable) {
    if (accumulator == undefined) {
      accumulator = currentValue;
    }
    else {
      const returnValue = reducer(accumulator as U, currentValue, index++);

      accumulator = (returnValue instanceof Promise)
        ? await returnValue
        : returnValue;
    }
  }

  return accumulator as U;
}

async function async<T, U>(iterable: AnyIterable<T>, reducer: AsyncReducer<T, U>, initialValue?: U): Promise<U> {
  let accumulator: T | U | undefined = initialValue;
  let index = 0;

  for await (const currentValue of iterable) {
    if (accumulator == undefined) {
      accumulator = currentValue;
    }
    else {
      const returnValue = reducer(accumulator as U, currentValue, index++);

      accumulator = (returnValue instanceof Promise)
        ? await returnValue
        : returnValue;
    }
  }

  return accumulator as U;
}
