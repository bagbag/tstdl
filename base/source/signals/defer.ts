import { isUndefined } from '#/utils/type-guards.js';
import type { Signal } from './api.js';
import { computed } from './api.js';

export function defer<T>(source: () => Signal<T>): Signal<T> {
  let signal: Signal<T> | undefined;

  return computed(() => {
    if (isUndefined(signal)) {
      signal = source();
    }

    return signal();
  });
}
