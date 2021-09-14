/* eslint-disable @typescript-eslint/no-shadow */

import type { NgZone } from '@angular/core';
import type { MonoTypeOperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';

export function runInZone<T>(zone: NgZone): MonoTypeOperatorFunction<T> {
  return function runInZone<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => source.subscribe({
      next: (state) => zone.run(() => subscriber.next(state)),
      complete: () => zone.run(() => subscriber.complete()),
      error: (error) => zone.run(() => subscriber.error(error))
    }));
  };
}

export function runOutsideAngular<T>(zone: NgZone): MonoTypeOperatorFunction<T> {
  return function runOutsideAngular<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => source.subscribe({
      next: (state) => zone.runOutsideAngular(() => subscriber.next(state)),
      complete: () => zone.runOutsideAngular(() => subscriber.complete()),
      error: (error) => zone.runOutsideAngular(() => subscriber.error(error))
    }));
  };
}

export function runTaskInZone<T>(zone: NgZone): MonoTypeOperatorFunction<T> {
  return function runTaskInZone<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => source.subscribe({
      next: (state) => zone.runTask(() => subscriber.next(state)),
      complete: () => zone.runTask(() => subscriber.complete()),
      error: (error) => zone.runTask(() => subscriber.error(error))
    }));
  };
}

export function runGuardedInZone<T>(zone: NgZone): MonoTypeOperatorFunction<T> {
  return function runGuardedInZone<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => source.subscribe({
      next: (state) => zone.runGuarded(() => subscriber.next(state)),
      complete: () => zone.runGuarded(() => subscriber.complete()),
      error: (error) => zone.runGuarded(() => subscriber.error(error))
    }));
  };
}
