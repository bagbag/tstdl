import type { Observable } from 'rxjs';
import { combineLatestWith, fromEvent, map, of, startWith, switchMap } from 'rxjs';

export type TouchEvents = {
  start: TouchEvent | undefined,
  move: TouchEvent | undefined,
  end: TouchEvent | undefined,
  cancel: TouchEvent | undefined
};

/**
 * creates an observable that emits object with the latest state from all touch events. Values are reset on every new start event
 * @param element element to observe touches on
 */
export function observeTouch(element: HTMLElement): Observable<TouchEvents> {
  const start$ = fromEvent<TouchEvent>(element, 'touchstart').pipe(startWith(undefined));
  const move$ = fromEvent<TouchEvent>(element, 'touchmove').pipe(startWith(undefined));
  const end$ = fromEvent<TouchEvent>(element, 'touchend').pipe(startWith(undefined));
  const cancel$ = fromEvent<TouchEvent>(element, 'touchcancel').pipe(startWith(undefined));

  return start$.pipe(
    switchMap((start) => of(start).pipe(combineLatestWith(move$, end$, cancel$))),
    map(([start, move, end, cancel]): TouchEvents => ({ start, move, end, cancel }))
  );
}
