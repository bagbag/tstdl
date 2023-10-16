import { isObservable } from 'rxjs';

import type { Signal, ToSignalOptions } from '#/signals/api.js';
import { computed, isSignal, toSignal } from '#/signals/api.js';
import type { ReactiveValue } from '#/types.js';

export type ReactiveValueToSignalOptions<T> = ToSignalOptions<T>;

export function reactiveValueToSignal<T>(source: ReactiveValue<T>, options?: ReactiveValueToSignalOptions<undefined> & { requireSync?: false }): Signal<T | undefined>;
export function reactiveValueToSignal<T, I>(source: ReactiveValue<T>, options: ReactiveValueToSignalOptions<I> & { initialValue: I, requireSync?: false }): Signal<T | I>;
export function reactiveValueToSignal<T>(source: ReactiveValue<T>, options: ReactiveValueToSignalOptions<undefined> & { requireSync: true }): Signal<T>;
export function reactiveValueToSignal<T, I>(source: ReactiveValue<T>, options?: ReactiveValueToSignalOptions<I>): Signal<T | I | undefined> {
  if (isSignal(source)) {
    return source;
  }

  if (isObservable(source)) {
    return toSignal<T | I, I>(source, options as ReactiveValueToSignalOptions<I> & { initialValue: I, requireSync?: false });
  }

  return computed(() => source);
}
