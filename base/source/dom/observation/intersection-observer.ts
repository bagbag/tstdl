import { IterableWeakMap } from '#/data-structures/iterable-weak-map.js';
import { toSignal, type Signal } from '#/signals/api.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { isDefined, isNumber } from '#/utils/type-guards.js';
import { Subject, filter, fromEventPattern, map, shareReplay, type Observable, type Subscription } from 'rxjs';

type ObserverMapEntry = {
  observer: IntersectionObserver,
  subject: Subject<IntersectionObserverEntry[]>,
  elementObservables: FactoryMap<Element, Observable<IntersectionObserverEntry>>
};

const observerMap = new FactoryMap(
  (root: IntersectionObserverInit['root']) =>
    new FactoryMap((rootMargin: IntersectionObserverInit['rootMargin']) =>
      new FactoryMap((threshold: IntersectionObserverInit['threshold']): ObserverMapEntry => {
        const observer = new IntersectionObserver((entries) => subject.next(entries), { root, rootMargin, threshold });
        const subject = new Subject<IntersectionObserverEntry[]>;

        return ({
          observer,
          subject,
          elementObservables: new FactoryMap((element) => fromEventPattern<IntersectionObserverEntry>(
            (handler) => {
              observer.observe(element);
              return subject.pipe(
                map((entries) => entries.find((entry) => entry.target == element)),
                filter(isDefined)
              ).subscribe((entry) => handler(entry));
            },
            (_, subscription: Subscription) => {
              observer.unobserve(element);
              subscription.unsubscribe();
            }
          ).pipe(shareReplay({ bufferSize: 1, refCount: true })), new IterableWeakMap())
        });
      }, undefined, (threshold) => isNumber(threshold) ? threshold : threshold?.join(',')))
);

function observeResize$(element: Element, options?: IntersectionObserverInit): Observable<IntersectionObserverEntry> {
  return observerMap.get(options?.root).get(options?.rootMargin).get(options?.threshold).elementObservables.get(element);
}

export function observeResize(elements: Element, options?: IntersectionObserverInit): Signal<IntersectionObserverEntry | undefined> {
  return toSignal(observeResize$(elements, options));
}
