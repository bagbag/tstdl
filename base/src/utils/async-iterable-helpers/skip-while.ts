import { AnyIterable } from '../any-iterable-iterator';
import { takeWhileAsync } from './take-while';
import { AsyncPredicate } from './types';

export function skipWhileAsync<T>(iterable: AnyIterable<T>, predicate: AsyncPredicate<T>): AsyncIterableIterator<T> {
  return takeWhileAsync(iterable, false, (item, index) => {
    const returnValue = predicate(item, index);

    const skip = (returnValue instanceof Promise)
      ? returnValue.then((skip) => !skip)
      : !returnValue;

    return skip;
  });
}
