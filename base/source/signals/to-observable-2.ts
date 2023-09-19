import type { Observable } from 'rxjs';

import type { Signal } from './api.js';
import { toObservable } from './implementation/to-observable.js';

/**
 * Exposes the value of an `Signal` as an RxJS `Observable`.
 *
 * The signal's value will be propagated into the `Observable`'s subscribers using an `effect`.
 */
export function toObservable2<T>(source: Signal<T>): Observable<T> {
  return toObservable(source);
}
