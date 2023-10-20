import { isUndefined } from '#/utils/type-guards.js';
import type { Signal } from './api.js';
import { computed, untracked } from './api.js';

export function defer<T>(signalFactory: () => Signal<T>): Signal<T> {
  let source: Signal<T> | undefined;

  return computed(() => {
    if (isUndefined(source)) {
      source = untracked(signalFactory);
    }

    return source();
  });
}
