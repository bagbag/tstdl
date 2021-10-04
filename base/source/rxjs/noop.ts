import type { MonoTypeOperatorFunction, Observable } from 'rxjs';

export function noopOperator<T>(): MonoTypeOperatorFunction<T> {
  return noop;
}

export function noop<T>(source: Observable<T>): Observable<T> {
  return source;
}
