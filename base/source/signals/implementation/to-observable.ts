import { Observable } from 'rxjs';

import type { Signal } from './api.js';
import { effect } from './effect.js';
import { untracked } from './untracked.js';

/**
 * Exposes the value of an Angular `Signal` as an RxJS `Observable`.
 *
 * The signal's value will be propagated into the `Observable`'s subscribers using an `effect`.
 */
export function toObservable<T>(source: Signal<T>): Observable<T> {
  return new Observable((subscriber) => {
    const effectRef = effect(() => {
      try {
        const value = source();
        untracked(() => subscriber.next(value));
      }
      catch (error) {
        untracked(() => subscriber.error(error));
      }
    }, { allowSignalWrites: true });

    return () => effectRef.destroy();
  });
}
