import type { AnyIterable } from '../any-iterable-iterator';
import { isIterable } from '../iterable-helpers/is-iterable';
import { isDefined } from '../type-guards';
import { isAsyncIterable } from './is-async-iterable';

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
    async next(...args: [] | [TNext]) { // eslint-disable-line @typescript-eslint/require-await
      return iterator.next(...args);
    }
  };

  if (isDefined(iterator.return)) { // eslint-disable-line @typescript-eslint/unbound-method
    asyncIterator.return = async function _return(value?: TReturn | PromiseLike<TReturn>) {
      return iterator.return!(await value);
    };
  }

  if (isDefined(iterator.throw)) { // eslint-disable-line @typescript-eslint/unbound-method
    asyncIterator.throw = async function _throw(error?: any) { // eslint-disable-line @typescript-eslint/require-await
      return iterator.throw!(error);
    };
  }

  return asyncIterator;
}
