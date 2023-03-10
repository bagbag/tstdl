import { registerFinalization } from '@tstdl/base/memory';
import { isUndefined } from '@tstdl/base/utils';
import type { Observable, Subscription } from 'rxjs';
import type { Signal } from './api';
import { computed } from './computed';
import { emptySignalValue, isEmpty } from './empty';
import { signal } from './signal';

export function fromObservable<T>(observable: Observable<T>): Signal<T>;
export function fromObservable<T, U>(observable: Observable<T>, initialValue: U): Signal<T | U>;
export function fromObservable<T, U>(...args: [observable: Observable<T>, initialValue?: U]): Signal<T | U> {
  const observable = args[0];
  const initialValue = (args.length == 2) ? args[1] as U : emptySignalValue as U;

  let internalSignal: Signal<T | U> | undefined;
  let subscription: Subscription | undefined;

  let handler = (): T | U => {
    ([internalSignal, subscription] = internalFromObservable(observable, initialValue));
    handler = () => internalSignal!();

    if (isEmpty(internalSignal)) {
      throw new Error('Signals observable source had no immediate value. If observable is asynchronous, make sure to provide initialValue or use startWith().');
    }

    return internalSignal();
  };

  const result = computed(() => handler());
  registerFinalization(result, () => subscription?.unsubscribe());

  return result;
}

function internalFromObservable<T, U>(observable: Observable<T>, initialValue: U): [Signal<T | U>, Subscription] {
  const valueSignal = signal<T | U>(initialValue);
  const signalWeakRef = new WeakRef(valueSignal);

  const subscription = observable.subscribe((newValue) => {
    const signalRef = signalWeakRef.deref();

    if (isUndefined(signalRef)) {
      subscription.unsubscribe();
      return;
    }

    signalRef.set(newValue);
  });

  return [valueSignal, subscription];
}
