import type { AnyIterable } from '../any-iterable-iterator';
import { timeout } from '../timing';
import type { ThrottleFunction } from './types';

export function throttle<T>(iterable: AnyIterable<T>, delayOrThrottleFunction: number | ThrottleFunction): AsyncIterableIterator<T>;
export async function* throttle<T>(iterable: AnyIterable<T>, delayOrThrottleFunction: number | ThrottleFunction): AsyncIterableIterator<T> {
  const throttleFunction = (typeof delayOrThrottleFunction == 'number')
    ? () => timeout(delayOrThrottleFunction) // eslint-disable-line @typescript-eslint/promise-function-async
    : delayOrThrottleFunction;

  for await (const item of iterable) {
    yield item;
    await throttleFunction();
  }
}
