import type { AnyIterable } from '../any-iterable-iterator.js';
import { Timer } from '../timer.js';
import { immediate } from '../timing.js';

export async function* interruptEveryAsync<T>(iterable: AnyIterable<T>, every: number): AsyncIterableIterator<T> {
  let counter = 0;

  for await (const item of iterable) {
    if ((counter++ % every) == 0) {
      await immediate();
    }

    yield item;
  }
}

export async function* interruptPerSecondAsync<T>(iterable: AnyIterable<T>, value: number): AsyncIterableIterator<T> {
  const delay = Math.round(1e9 / value);
  const stopwatch = new Timer(true);

  for await (const item of iterable) {
    const elapsed = stopwatch.nanoseconds;

    if (elapsed >= delay) {
      stopwatch.restart();
      await immediate();
    }

    yield item;
  }
}
