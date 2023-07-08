import type { MonoTypeOperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';

import { untracked } from './api.js';

/** wraps observer in {@link untracked} */
export function runInUntracked<T>(): MonoTypeOperatorFunction<T> {
  return function runInUntracked<T>(source: Observable<T>): Observable<T> { // eslint-disable-line @typescript-eslint/no-shadow
    return new Observable<T>((subscriber) => source.subscribe({
      next: (state) => untracked(() => subscriber.next(state)),
      complete: () => untracked(() => subscriber.complete()),
      error: (error) => untracked(() => subscriber.error(error))
    }));
  };
}
