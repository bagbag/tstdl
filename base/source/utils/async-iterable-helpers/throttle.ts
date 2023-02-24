import type { AnyIterable } from '../any-iterable-iterator.js';
import { timeout } from '../timing.js';
import type { ThrottleFunction } from './types.js';

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
