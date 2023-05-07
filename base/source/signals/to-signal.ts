/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Observable } from 'rxjs';

import { isDevMode } from '#/core.js';
import { NotSupportedError } from '#/error/not-supported.error.js';
import { registerFinalization } from '#/memory/finalization.js';
import type { Signal } from './api.js';
import { computed, signal, untracked } from './api.js';

const enum StateKind {
  NoValue = 0,
  Value = 1,
  Error = 2
}

type NoValueState = {
  kind: StateKind.NoValue
};

type ValueState<T> = {
  kind: StateKind.Value,
  value: T
};

type ErrorState = {
  kind: StateKind.Error,
  error: unknown
};

type State<T = unknown> = NoValueState | ValueState<T> | ErrorState;

export type ToSignalOptions<T> = {
  /**
   * Initial value for the signal produced by `toSignal`.
   *
   * This will be the value of the signal until the observable emits its first value.
   */
  initialValue?: T,

  /**
   * Whether to require that the observable emits synchronously when `toSignal` subscribes.
   *
   * If this is `true`, `toSignal` will assert that the observable produces a value immediately upon
   * subscription. Setting this option removes the need to either deal with `undefined` in the
   * signal type or provide an `initialValue`, at the cost of a runtime error if this requirement is
   * not met.
   */
  requireSync?: boolean
};

/**
 * Get the current value of an `Observable` as a reactive `Signal`.
 *
 * `toSignal` returns a `Signal` which provides synchronous reactive access to values produced
 * by the given `Observable`, by subscribing to that `Observable`. The returned `Signal` will always
 * have the most recent value emitted by the subscription, and will throw an error if the
 * `Observable` errors.
 *
 * Before the `Observable` emits its first value, the `Signal` will return `undefined`. To avoid
 * this, either an `initialValue` can be passed or the `requireSync` option enabled.
 */
export function toSignal<T>(source: Observable<T>): Signal<T | undefined>;

/**
 * Get the current value of an `Observable` as a reactive `Signal`.
 *
 * `toSignal` returns a `Signal` which provides synchronous reactive access to values produced
 * by the given `Observable`, by subscribing to that `Observable`. The returned `Signal` will always
 * have the most recent value emitted by the subscription, and will throw an error if the
 * `Observable` errors.
 *
 * Before the `Observable` emits its first value, the `Signal` will return the configured
 * `initialValue`, or `undefined` if no `initialValue` is provided. If the `Observable` is
 * guaranteed to emit synchronously, then the `requireSync` option can be passed instead.
 */
export function toSignal<T>(source: Observable<T>, options?: ToSignalOptions<undefined> & { requireSync?: false }): Signal<T | undefined>;


/**
 * Get the current value of an `Observable` as a reactive `Signal`.
 *
 * `toSignal` returns a `Signal` which provides synchronous reactive access to values produced
 * by the given `Observable`, by subscribing to that `Observable`. The returned `Signal` will always
 * have the most recent value emitted by the subscription, and will throw an error if the
 * `Observable` errors.
 *
 * Before the `Observable` emits its first value, the `Signal` will return the configured
 * `initialValue`. If the `Observable` is guaranteed to emit synchronously, then the `requireSync`
 * option can be passed instead.
 */
export function toSignal<T, U extends T | null | undefined>(source: Observable<T>, options: ToSignalOptions<U> & { initialValue: U, requireSync?: false }): Signal<T | U>;

/**
 * Get the current value of an `Observable` as a reactive `Signal`.
 *
 * `toSignal` returns a `Signal` which provides synchronous reactive access to values produced
 * by the given `Observable`, by subscribing to that `Observable`. The returned `Signal` will always
 * have the most recent value emitted by the subscription, and will throw an error if the
 * `Observable` errors.
 *
 * With `requireSync` set to `true`, `toSignal` will assert that the `Observable` produces a value
 * immediately upon subscription. No `initialValue` is needed in this case, and the returned signal
 * does not include an `undefined` type.
 */
export function toSignal<T>(source: Observable<T>, options: ToSignalOptions<undefined> & { requireSync: true }): Signal<T>;

export function toSignal<T, U = undefined>(source: Observable<T>, options: ToSignalOptions<U> = {}): Signal<T | U> {
  const { initialValue, requireSync = false } = options;

  const initialState: State<T | U> = requireSync ? { kind: StateKind.NoValue } : { kind: StateKind.Value, value: initialValue as U };
  const state = signal<State<T | U>>(initialState);

  const subscription = source.subscribe({
    next: (value) => state.set({ kind: StateKind.Value, value }),
    error: (error) => state.set({ kind: StateKind.Error, error })
  });

  if (isDevMode() && requireSync && untracked(state).kind === StateKind.NoValue) {
    throw new Error('`toSignal()` called with `requireSync` but `Observable` did not emit synchronously.');
  }

  const result = computed(() => {
    const current = state();

    switch (current.kind) {
      case StateKind.Value:
        return current.value;

      case StateKind.Error:
        throw current.error;

      case StateKind.NoValue:
        throw new Error('`toSignal()` called with `requireSync` but `Observable` did not emit synchronously.');

      default:
        throw new NotSupportedError(`StateKind ${(current as State).kind} not supported.`);
    }
  });

  registerFinalization(result, () => subscription.unsubscribe());

  return result;
}
