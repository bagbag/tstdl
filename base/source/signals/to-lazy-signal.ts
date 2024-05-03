import { Subject, switchMap, type Observable } from 'rxjs';

import { computed, toSignal, type Signal, type ToSignalOptions } from './api.js';

const LAZY = Symbol('LAZY');

export const toLazySignal = function toLazySignal<T, I = undefined>(source: Observable<T>, options?: ToSignalOptions & { initialValue?: I }): Signal<T | I> {
  const subscribe$ = new Subject<void>();
  const lazySource = subscribe$.pipe(switchMap(() => source));
  const signal = toSignal<T>(lazySource, { initialValue: LAZY, ...options as any }) as Signal<T | I>; // eslint-disable-line @typescript-eslint/no-unsafe-argument

  let computation = (): T | I => {
    subscribe$.next();
    subscribe$.complete();

    const value = signal();
    computation = signal;

    if (value == LAZY) {
      throw new Error('`toLazySignal()` called with `requireSync` but `Observable` did not emit synchronously.');
    }

    return value;
  };

  return computed(() => computation());
} as typeof toSignal;
