import type { Observable } from 'rxjs';
import { Subject, switchMap } from 'rxjs';

import type { Signal, ToSignalOptions } from './api.js';
import { computed, toSignal } from './api.js';

const LAZY = Symbol('LAZY');

/**
 * Like `toSignal`, except that it uses untracked internal operations (required for some scenarios, but might be less safe in terms of bugs catching) and has the ability to subscribe lazily.
 * Subscription to observable is cleaned up using finalization (garbage collection) of the signal.
 */
export function toLazySignal<T>(source: Observable<T>): Signal<T | undefined>;
// Options with `undefined` initial value and no `requiredSync` -> `undefined`.
export function toLazySignal<T>(source: Observable<T>, options: ToSignalOptions & { initialValue?: undefined, requireSync?: false }): Signal<T | undefined>;
// Options with `null` initial value -> `null`.
export function toLazySignal<T>(source: Observable<T>, options: ToSignalOptions & { initialValue?: null, requireSync?: false }): Signal<T | null>;
// Options with `undefined` initial value and `requiredSync` -> strict result type.
export function toLazySignal<T>(source: Observable<T>, options: ToSignalOptions & { initialValue?: undefined, requireSync: true }): Signal<T>;
// Options with a more specific initial value type.
export function toLazySignal<T, const I>(source: Observable<T>, options: ToSignalOptions & { initialValue: I, requireSync?: false }): Signal<T | I>;
export function toLazySignal<T, I = undefined>(source: Observable<T>, options?: ToSignalOptions & { initialValue?: I }): Signal<T | I> {
  const subscribe$ = new Subject<void>();
  const lazySource = subscribe$.pipe(switchMap(() => source));
  const signal = toSignal<T>(lazySource, { initialValue: LAZY, ...options as any }) as Signal<T | I>; // eslint-disable-line @typescript-eslint/no-unsafe-argument

  let subscribed = false;

  return computed(() => {
    if (!subscribed) {
      subscribed = true;

      subscribe$.next();
      subscribe$.complete();

      if (signal() == LAZY) {
        throw new Error('`toLazySignal()` called with `requireSync` but `Observable` did not emit synchronously.');
      }
    }

    return signal();
  });
}
