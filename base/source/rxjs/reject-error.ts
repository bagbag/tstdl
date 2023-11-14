import type { MonoTypeOperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';

export function rejectErrors<T>(): MonoTypeOperatorFunction<T> {
  return function rejectErrors<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => source.subscribe({
      next: (value) => subscriber.next(value),
      complete: () => subscriber.complete()
    }));
  };
}
