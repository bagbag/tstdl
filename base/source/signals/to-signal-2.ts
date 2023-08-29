import type { Observable, Subscribable, Unsubscribable } from 'rxjs';

import { isDevMode } from '#/core.js';
import { registerFinalization } from '#/memory/finalization.js';
import { isUndefined } from '#/utils/type-guards.js';
import type { Signal, ToSignalOptions, WritableSignal } from './api.js';
import { computed, signal, untracked } from './api.js';

type ToSignalInput<T> = Observable<T> | Subscribable<T>;

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

type State<T> = NoValueState | ValueState<T> | ErrorState;

export type ToSignal2Options<T> = ToSignalOptions<T> & {
  /** defer subscription until signal is used */
  lazy?: boolean
};

/** like `toSignal`, except that it uses untracked internal operations (required for some scenarios, but might be less safe in terms of bugs catching) and has the ability to subscribe lazily */
export function toSignal2<T>(source: ToSignalInput<T>): Signal<T | undefined>;
export function toSignal2<T>(source: ToSignalInput<T>, options: ToSignal2Options<undefined> & { requireSync: true }): Signal<T>;
export function toSignal2<T, const I = undefined>(source: ToSignalInput<T>, options: ToSignal2Options<I> & { requireSync?: false }): Signal<T | I>;
export function toSignal2<T, const I = undefined>(source: ToSignalInput<T>, options?: ToSignal2Options<I>): Signal<T | I> {
  const initialState: State<T | I> = (options?.requireSync == true) ? { kind: StateKind.NoValue } : { kind: StateKind.Value, value: options?.initialValue as I };
  const state = signal<State<T | I>>(initialState);

  let subscription: Unsubscribable | undefined;

  if (options?.lazy != true) {
    subscription = subscribe<T, I>(source, state, options);
  }

  const result = computed(() => {
    if (isUndefined(subscription)) {
      subscription = subscribe<T, I>(source, state, options);
    }

    const current = state();

    switch (current.kind) { // eslint-disable-line default-case
      case StateKind.Value:
        return current.value;

      case StateKind.Error:
        throw current.error;

      case StateKind.NoValue:
        throw new Error('`toSignalLazy()` called with `requireSync` but `Observable` did not emit synchronously.');
    }
  });

  registerFinalization(result, () => subscription?.unsubscribe());

  return result;
}

function subscribe<T, I>(source: Subscribable<T>, state: WritableSignal<State<T | I>>, options?: ToSignal2Options<I>): Unsubscribable {
  const subscription = source.subscribe({
    next: (value) => untracked(() => state.set({ kind: StateKind.Value, value })),
    error: (error) => untracked(() => state.set({ kind: StateKind.Error, error }))
  });

  if (isDevMode() && (options?.requireSync == true) && untracked(state).kind == StateKind.NoValue) {
    throw new Error('`toSignal()` called with `requireSync` but `Observable` did not emit synchronously.');
  }

  return subscription;
}
