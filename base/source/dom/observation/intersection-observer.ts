import { Subject, filter, fromEventPattern, map, shareReplay, type Observable, type Subscription } from 'rxjs';

import { toSignal, type Signal } from '#/signals/api.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { isDefined, isNumber } from '#/utils/type-guards.js';

const nullRoot = { nullRoot: true };

const rootMap = new FactoryMap((root: NonNullable<IntersectionObserverInit['root']> | typeof nullRoot) => {
  const rootMarginMap = new FactoryMap((rootMargin: IntersectionObserverInit['rootMargin']) => {
    const thresholdMap = new FactoryMap((threshold: IntersectionObserverInit['threshold']): FactoryMap<Element, Observable<IntersectionObserverEntry>> => {
      const observer = new IntersectionObserver((entries) => subject.next(entries), { root: root == nullRoot ? null : root as IntersectionObserverInit['root'], rootMargin, threshold });
      const subject = new Subject<IntersectionObserverEntry[]>();

      const elementObservablesMap = new FactoryMap(
        (element: Element) => fromEventPattern<IntersectionObserverEntry>(
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

            elementObservablesMap.delete(element);

            if (elementObservablesMap.size == 0) {
              thresholdMap.delete(threshold);

              if (thresholdMap.size == 0) {
                rootMarginMap.delete(rootMargin);

                if (rootMarginMap.size == 0) {
                  rootMap.delete(root);
                }
              }
            }
          }
        ).pipe(shareReplay({ bufferSize: 1, refCount: true }))
      );

      return elementObservablesMap;
    }, undefined, (threshold) => isNumber(threshold) ? threshold : threshold?.join(','));

    return thresholdMap;
  });

  return rootMarginMap;
}
);

export function observeIntersection$(element: Element, options?: IntersectionObserverInit): Observable<IntersectionObserverEntry> {
  return rootMap.get(options?.root ?? nullRoot).get(options?.rootMargin).get(options?.threshold).get(element);
}

export function observeIntersection(elements: Element, options?: IntersectionObserverInit): Signal<IntersectionObserverEntry | undefined> {
  return toSignal(observeIntersection$(elements, options));
}
