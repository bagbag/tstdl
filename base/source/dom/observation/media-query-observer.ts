import { toSignal, type Signal } from '#/signals/api.js';
import { fromEvent, map, startWith, type Observable } from 'rxjs';

/**
 * Creates an observable that emits whether the query matches
 * @param query query to watch
 */
export function observeMediaQuery$(query: string): Observable<boolean> {
  const mediaQueryList = window.matchMedia(query);
  return fromEvent(mediaQueryList, 'change').pipe(startWith(mediaQueryList), map(() => mediaQueryList.matches));
}

/**
 * Creates an signal that signals whether the query matches
 * @param query query to watch
 */
export function observeMediaQuery(query: string): Signal<boolean> {
  return toSignal(observeMediaQuery$(query), { requireSync: true });
}
