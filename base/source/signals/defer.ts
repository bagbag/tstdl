import type { Signal } from './api.js';
import { computed, untracked } from './api.js';

export function defer<T>(signalFactory: () => Signal<T>): Signal<T> {
  let computation = (): T => {
    computation = untracked(signalFactory);
    return computation();
  };

  return computed(() => computation());
}
