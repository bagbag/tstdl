import type { Observable } from 'rxjs';

import { computed, toSignal, untracked, type Signal, type ToSignalOptions } from './api.js';

export const toLazySignal = function toLazySignal<T, I = undefined>(source: Observable<T>, options?: ToSignalOptions<T | I> & { initialValue?: I }): Signal<T | I> {
  let computation = (): T | I => {
    const signal = untracked(() => toSignal<T>(source, { ...options as any }) as Signal<T | I>); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    const value = signal();

    computation = signal;
    return value;
  };

  return computed(() => computation(), { equal: options?.equal });
} as typeof toSignal;
