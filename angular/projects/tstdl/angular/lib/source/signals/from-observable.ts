import { isUndefined } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import type { Signal } from './api';
import { signal } from './signal';

export function fromObservable<T, U>(observable: Observable<T>, initialValue: U): Signal<T | U> {
  const signal$ = signal<T | U>(initialValue);
  const signalWeakRef = new WeakRef(signal$);

  const subscription = observable.subscribe((value) => {
    const signalRef = signalWeakRef.deref();

    if (isUndefined(signalRef)) {
      subscription.unsubscribe();
      return;
    }

    signalRef.set(value);
  });

  return signal$;
}
