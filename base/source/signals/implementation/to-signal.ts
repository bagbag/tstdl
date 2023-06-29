/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Observable, Subscribable } from 'rxjs';

import { isDevMode } from '#/core.js';
import { registerFinalization } from '#/memory/finalization.js';
import type { Signal } from './api.js';
import { computed } from './computed.js';
import type { WritableSignal } from './signal.js';
import { signal } from './signal.js';
import { untracked } from './untracked.js';

const enum StateKind {
  NoValue = 0,
  Value = 1,
  Error = 2
}

interface NoValueState {
  kind: StateKind.NoValue;
}

interface ValueState<T> {
  kind: StateKind.Value;
  value: T;
}

interface ErrorState {
  kind: StateKind.Error;
  error: unknown;
}

type State<T> = NoValueState | ValueState<T> | ErrorState;

/**
 * Options for `toSignal`.
 */
export interface ToSignalOptions<T> {
  /**
   * Initial value for the signal produced by `toSignal`.
   *
   * This will be the value of the signal until the observable emits its first value.
   */
  initialValue?: T;

  /**
   * Whether to require that the observable emits synchronously when `toSignal` subscribes.
   *
   * If this is `true`, `toSignal` will assert that the observable produces a value immediately upon
   * subscription. Setting this option removes the need to either deal with `undefined` in the
   * signal type or provide an `initialValue`, at the cost of a runtime error if this requirement is
   * not met.
   */
  requireSync?: boolean;
}

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
export function toSignal<T>(source: Observable<T> | Subscribable<T>): Signal<T | undefined>;

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
export function toSignal<T>(source: Observable<T> | Subscribable<T>, options?: ToSignalOptions<undefined> & { requireSync?: false }): Signal<T | undefined>;


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
export function toSignal<T, U extends T | null | undefined>(source: Observable<T> | Subscribable<T>, options: ToSignalOptions<U> & { initialValue: U, requireSync?: false }): Signal<T | U>;

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
export function toSignal<T>(source: Observable<T> | Subscribable<T>, options: ToSignalOptions<undefined> & { requireSync: true }): Signal<T>;
export function toSignal<T, U = undefined>(source: Observable<T> | Subscribable<T>, options?: ToSignalOptions<U>): Signal<T | U> {
  // Note: T is the Observable value type, and U is the initial value type. They don't have to be
  // the same - the returned signal gives values of type `T`.
  let state: WritableSignal<State<T | U>>;
  if (options?.requireSync) {
    // Initially the signal is in a `NoValue` state.
    state = signal({ kind: StateKind.NoValue });
  } else {
    // If an initial value was passed, use it. Otherwise, use `undefined` as the initial value.
    state = signal<State<T | U>>({ kind: StateKind.Value, value: options?.initialValue as U });
  }

  const sub = source.subscribe({
    next: value => state.set({ kind: StateKind.Value, value }),
    error: error => state.set({ kind: StateKind.Error, error }),
    // Completion of the Observable is meaningless to the signal. Signals don't have a concept of
    // "complete".
  });

  if (isDevMode() && options?.requireSync && untracked(state).kind === StateKind.NoValue) {
    throw new Error('`toSignal()` called with `requireSync` but `Observable` did not emit synchronously.');
  }

  // The actual returned signal is a `computed` of the `State` signal, which maps the various states
  // to either values or errors.
  const result = computed(() => {
    const current = state();
    switch (current.kind) {
      case StateKind.Value:
        return current.value;
      case StateKind.Error:
        throw current.error;
      case StateKind.NoValue:
        throw new Error('`toSignal()` called with `requireSync` but `Observable` did not emit synchronously.');
    }
  });

  registerFinalization(result, () => sub.unsubscribe());

  return result;
}
