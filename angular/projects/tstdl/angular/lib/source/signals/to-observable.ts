/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable } from 'rxjs';
import type { Signal } from './api';
import { effect } from './effect';

/**
 * Exposes the value of an Angular `Signal` as an RxJS `Observable`.
 *
 * The signal's value will be propagated into the `Observable`'s subscribers using an `effect`.
 *
 * `toObservable` must be called in an injection context.
 *
 * @developerPreview
 */
export function toObservable<T>(source: Signal<T>): Observable<T> {
  return new Observable((subscriber) => {
    const effectRef = effect(() => {
      try {
        subscriber.next(source());
      }
      catch (error) {
        subscriber.error(error);
      }
    }, { allowSignalWrites: true, runImmediately: true });

    return () => effectRef.destroy();
  });
}
