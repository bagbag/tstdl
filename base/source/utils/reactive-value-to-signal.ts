import { isObservable } from 'rxjs';

import { computed, isSignal, toSignal, type Signal, type ToSignalOptions } from '#/signals/api.js';
import type { ReactiveValue } from '#/types.js';

export type ReactiveValueToSignalOptions = ToSignalOptions;

export function reactiveValueToSignal<T>(source: ReactiveValue<T>): Signal<T | undefined>;
export function reactiveValueToSignal<T>(source: ReactiveValue<T>, options: ReactiveValueToSignalOptions & { initialValue?: undefined, requireSync?: false }): Signal<T | undefined>; // eslint-disable-line @typescript-eslint/unified-signatures
export function reactiveValueToSignal<T>(source: ReactiveValue<T>, options: ReactiveValueToSignalOptions & { initialValue?: null, requireSync?: false }): Signal<T | null>;
export function reactiveValueToSignal<T>(source: ReactiveValue<T>, options: ReactiveValueToSignalOptions & { initialValue?: undefined, requireSync: true }): Signal<T>;
export function reactiveValueToSignal<T, const I>(source: ReactiveValue<T>, options: ReactiveValueToSignalOptions & { initialValue: I, requireSync?: false }): Signal<T | I>;
export function reactiveValueToSignal<T, I = undefined>(source: ReactiveValue<T>, options?: ReactiveValueToSignalOptions & { initialValue?: I }): Signal<T | I> {
  if (isSignal(source)) {
    return source;
  }

  if (isObservable(source)) {
    return toSignal(source, options as any) as Signal<T | I>; // eslint-disable-line @typescript-eslint/no-unsafe-argument
  }

  return computed(() => source);
}
