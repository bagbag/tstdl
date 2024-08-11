import { Observable } from 'rxjs';

import type { SignalsInjector } from '../api.js';
import type { Signal } from './api.js';
import { effect } from './effect.js';
import { untracked } from './untracked.js';

/**
 * Options for `toObservable`.
 *
 * @developerPreview
 */
export interface ToObservableOptions {

  /**
   * The `Injector` to use when creating the underlying `effect` which watches the signal.
   *
   * If this isn't specified, the current [injection context](guide/di/dependency-injection-context)
   * will be used.
   */
  injector?: SignalsInjector;
}

/**
 * Exposes the value of an `Signal` as an RxJS `Observable`.
 *
 * The signal's value will be propagated into the `Observable`'s subscribers using an `effect`.
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
    }, { allowSignalWrites: true, injector: options?.injector, manualCleanup: true });

    return () => effectRef.destroy();
  });
}
