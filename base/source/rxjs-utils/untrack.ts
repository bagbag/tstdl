import { type MonoTypeOperatorFunction, Observable } from 'rxjs';

import { untracked } from '#/signals/api.js';

export function untrack<T>(): MonoTypeOperatorFunction<T> {
  return function untrack(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => source.subscribe({
      next: (state) => untracked(() => subscriber.next(state)),
      complete: () => untracked(() => subscriber.complete()),
      error: (error) => untracked(() => subscriber.error(error))
    }));
  };
}
