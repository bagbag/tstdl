import { Observable } from 'rxjs';

import type { Signal } from './api.js';
import { effect, untracked } from './api.js';

export type ToObservableOptions = {
  /**
   * Immediately run inner effect after creation without scheduling - for advanced use cases.
   */
  emitImmediately: boolean
};

/**
 * Exposes the value of an Angular `Signal` as an RxJS `Observable`.
 *
 * The signal's value will be propagated into the `Observable`'s subscribers using an `effect`.
 *
 * `toObservable` must be called in an injection context.
 */
export function toObservable<T>(source: Signal<T>, options?: ToObservableOptions): Observable<T> {
  return new Observable((subscriber) => {
    const effectRef = effect(() => {
      try {
        const value = source();
        untracked(() => subscriber.next(value));
      }
      catch (error) {
        untracked(() => subscriber.error(error));
      }
    }, { allowSignalWrites: true, runImmediately: options?.emitImmediately });

    return () => effectRef.destroy();
  });
}
