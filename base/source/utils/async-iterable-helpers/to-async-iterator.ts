import type { AnyIterable } from '../any-iterable-iterator.js';
import { isIterable } from '../iterable-helpers/is-iterable.js';
import { isDefined } from '../type-guards.js';
import { isAsyncIterable } from './is-async-iterable.js';

export function iterableToAsyncIterator<T>(iterable: AnyIterable<T>): AsyncIterator<T> {
  let asyncIterator: AsyncIterator<T>;

  if (isIterable(iterable)) {
    const iterator = iterable[Symbol.iterator]();
    asyncIterator = iteratorToAsyncIterator(iterator);
  }
  else if (isAsyncIterable(iterable)) {
    asyncIterator = iterable[Symbol.asyncIterator]();
  }
  else {
    throw new Error('parameter is neither iterable nor async-iterable');
  }

  return asyncIterator;
}

export function iteratorToAsyncIterator<T, TReturn = any, TNext = undefined>(iterator: Iterator<T, TReturn, TNext>): AsyncIterator<T, TReturn, TNext> {
  const asyncIterator: AsyncIterator<T, TReturn, TNext> = {
    async next(...args: [] | [TNext]) {
      return iterator.next(...args);
    }
  };

  if (isDefined(iterator.return)) {
    asyncIterator.return = async function _return(value?: TReturn | PromiseLike<TReturn>) {
      return iterator.return!(await value);
    };
  }

  if (isDefined(iterator.throw)) {
    asyncIterator.throw = async function _throw(error?: any) {
      return iterator.throw!(error);
    };
  }

  return asyncIterator;
}
