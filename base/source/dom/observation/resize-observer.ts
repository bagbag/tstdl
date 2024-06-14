import { IterableWeakMap } from '#/data-structures/iterable-weak-map.js';
import { toSignal, type Signal } from '#/signals/api.js';
import type { Record } from '#/types.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { isDefined } from '#/utils/type-guards.js';
import { Subject, filter, fromEventPattern, map, shareReplay, type Observable, type Subscription } from 'rxjs';

let observer: ResizeObserver | undefined;
let subject: Subject<ResizeObserverEntry[]> | undefined;

const elementObservablesMap = new FactoryMap<Element, Partial<Record<ResizeObserverBoxOptions | 'undefined', Observable<ResizeObserverEntry>>>>(() => ({}), new IterableWeakMap());

function observeResize$(element: Element, options?: ResizeObserverOptions): Observable<ResizeObserverEntry> {
  const box = options?.box ?? 'undefined';
  const elementObservables = elementObservablesMap.get(element);

  if (isDefined(elementObservables) && isDefined(elementObservables[box])) {
    return elementObservables[box]!;
  }

  subject ??= new Subject();
  observer ??= new ResizeObserver((entries) => subject!.next(entries));

  const elementResize$ = fromEventPattern<ResizeObserverEntry>(
    (handler) => {
      observer!.observe(element, options);
      return subject!.pipe(
        map((entries) => entries.find((entry) => entry.target == element)),
        filter(isDefined)
      ).subscribe((entry) => handler(entry));
    },
    (_, subscription: Subscription) => {
      observer!.unobserve(element);
      subscription.unsubscribe();
    }
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  elementObservables[box] = elementResize$;

  return elementResize$;
}

export function observeResize(elements: Element, options?: ResizeObserverOptions): Signal<ResizeObserverEntry | undefined> {
  return toSignal(observeResize$(elements, options));
}
