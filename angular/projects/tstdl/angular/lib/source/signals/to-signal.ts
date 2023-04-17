/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { isDevMode } from '@angular/core';
import { NotSupportedError } from '@tstdl/base/error/not-supported.error';
import { registerFinalization } from '@tstdl/base/memory';
import type { Observable } from 'rxjs';
import type { Signal } from './api';
import { computed } from './computed';
import { signal } from './signal';
import { untracked } from './untracked';

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

/**
 * Get the current value of an `Observable` as a reactive `Signal`.
 *
 * `toSignal` returns a `Signal` which provides synchronous reactive access to values produced
 * by the given `Observable`, by subscribing to that `Observable`. The returned `Signal` will always
 * have the most recent value emitted by the subscription, and will throw an error if the
 * `Observable` errors.
 *
 * If the `Observable` does not produce a value before the `Signal` is read, the `Signal` will throw
 * an error. To avoid this, use a synchronous `Observable` (potentially created with the `startWith`
 * operator) or pass an initial value to `toSignal` as the second argument.
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
 * `initialValue`. If the `Observable` is known to produce a value before the `Signal` will be read,
 * `initialValue` does not need to be passed.
 */
export function toSignal<T, U extends T | null | undefined>(source: Observable<T>, options: { initialValue: U, requireSync?: false }): Signal<T | U>;
export function toSignal<T>(source: Observable<T>, options: { requireSync: true }): Signal<T>;
export function toSignal<T, U = undefined>(source: Observable<T>, { initialValue, requireSync = false }: { initialValue?: U, requireSync?: boolean } = { requireSync: false }): Signal<T | U> {
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
