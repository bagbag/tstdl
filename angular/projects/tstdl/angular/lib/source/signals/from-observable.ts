import { NotSupportedError } from '@tstdl/base/error/not-supported.error';
import { registerFinalization } from '@tstdl/base/memory';
import { isUndefined } from '@tstdl/base/utils';
import type { Observable, Subscription } from 'rxjs';
import type { Signal } from './api';
import { computed } from './computed';
import { signal } from './signal';

enum StateKind {
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

export function fromObservable<T>(observable: Observable<T>): Signal<T>;
export function fromObservable<T, U>(observable: Observable<T>, initialValue: U): Signal<T | U>;
export function fromObservable<T, U>(observable: Observable<T>, initialValue?: U): Signal<T | U> {
  const hasInitialValue = (arguments.length == 2);

  const initialState: State<T | U> = hasInitialValue ? { kind: StateKind.Value, value: initialValue! } : { kind: StateKind.NoValue };
  const state = signal<State<T | U>>(initialState);

  let subscription: Subscription | undefined;

  function subscribe(): void {
    subscription = observable.subscribe({
      next: (value) => state.set({ kind: StateKind.Value, value }),
      error: (error) => state.set({ kind: StateKind.Error, error })
    });
  }

  const result = computed((): T | U => {
    if (isUndefined(subscription)) {
      subscribe();
    }

    const current = state();

    switch (current.kind) {
      case StateKind.Value:
        return current.value;

      case StateKind.NoValue:
        throw new Error('fromObservable() signal read before the Observable emitted. Provide initialValue or use startWith() if observable is asynchronous.');

      case StateKind.Error:
        throw current.error;

      default:
        throw NotSupportedError.fromEnum(StateKind, 'StateKind', (current as State<T | U>).kind);
    }
  });

  registerFinalization(result, () => subscription?.unsubscribe());

  return result;
}
