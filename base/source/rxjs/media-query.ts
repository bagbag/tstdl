import type { Observable } from 'rxjs';
import { fromEvent, map, startWith } from 'rxjs';

/**
 * creates an observable that emits whether the query matches
 * @param query query to watch
 */
export function observeMediaQuery(query: string): Observable<boolean> {
  const mediaQueryList = window.matchMedia(query);
  return fromEvent(mediaQueryList, 'change').pipe(startWith(mediaQueryList), map(() => mediaQueryList.matches));
}
