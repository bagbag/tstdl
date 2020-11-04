import { NgZone } from '@angular/core';
import { MonoTypeOperatorFunction, Observable } from 'rxjs';

export function runInZone<T>(zone: NgZone): MonoTypeOperatorFunction<T> {
  return function <T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) =>
      source.subscribe({
        next: (state) => zone.run(() => subscriber.next(state)),
        complete: () => zone.run(() => subscriber.complete()),
        error: (error) => zone.run(() => subscriber.error(error))
      })
    );
  }
}

export function runOutsideAngular<T>(zone: NgZone): MonoTypeOperatorFunction<T> {
  return function <T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) =>
      source.subscribe({
        next: (state) => zone.runOutsideAngular(() => subscriber.next(state)),
        complete: () => zone.runOutsideAngular(() => subscriber.complete()),
        error: (error) => zone.runOutsideAngular(() => subscriber.error(error))
      })
    );
  }
}

export function runTaskInZone<T>(zone: NgZone): MonoTypeOperatorFunction<T> {
  return function <T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) =>
      source.subscribe({
        next: (state) => zone.runTask(() => subscriber.next(state)),
        complete: () => zone.runTask(() => subscriber.complete()),
        error: (error) => zone.runTask(() => subscriber.error(error))
      })
    );
  }
}
