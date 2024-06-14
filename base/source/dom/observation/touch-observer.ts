import { combineLatestWith, fromEvent, map, of, startWith, switchMap, type Observable } from 'rxjs';
import type { EventListenerOptions } from 'rxjs/internal/observable/fromEvent';

export type TouchEvents = {
  start: TouchEvent | undefined,
  move: TouchEvent | undefined,
  end: TouchEvent | undefined,
  cancel: TouchEvent | undefined
};

/**
 * Creates an observable that emits object with the latest state from all touch events. Values are reset on every new start event
 * @param element element to observe touches on
 */
export function observeTouch$(element: HTMLElement, options: EventListenerOptions = {}): Observable<TouchEvents> {
  const start$ = fromEvent<TouchEvent>(element, 'touchstart', options).pipe(startWith(undefined));
  const move$ = fromEvent<TouchEvent>(element, 'touchmove', options).pipe(startWith(undefined));
  const end$ = fromEvent<TouchEvent>(element, 'touchend', options).pipe(startWith(undefined));
  const cancel$ = fromEvent<TouchEvent>(element, 'touchcancel', options).pipe(startWith(undefined));

  return start$.pipe(
    switchMap((start) => of(start).pipe(combineLatestWith(move$, end$, cancel$))),
    map(([start, move, end, cancel]): TouchEvents => ({ start, move, end, cancel }))
  );
}
