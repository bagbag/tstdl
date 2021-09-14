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

export function iteratorToAsyncIterator<T>(iterator: Iterator<T>): AsyncIterator<T> {
  const asyncIterator: AsyncIterator<T> = {
    async next(value?: any) { // eslint-disable-line @typescript-eslint/require-await
      return iterator.next(value);
    }
  };

  if (isDefined(iterator.return)) { // eslint-disable-line @typescript-eslint/unbound-method
    asyncIterator.return = ({ // eslint-disable-line @typescript-eslint/unbound-method
      async return(value: any) {
        return iterator.return!(await value);
      }
    }).return;
  }

  if (isDefined(iterator.throw)) { // eslint-disable-line @typescript-eslint/unbound-method
    asyncIterator.throw = ({ // eslint-disable-line @typescript-eslint/unbound-method
      async throw(error?: any) { // eslint-disable-line @typescript-eslint/require-await
        return iterator.throw!(error);
      }
    }).throw;
  }

  return asyncIterator;
}
