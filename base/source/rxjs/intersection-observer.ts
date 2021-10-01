import { isDefined, toArray } from '#/utils';
import type { Subscription } from 'rxjs';
import { Observable } from 'rxjs';

export type ObserveIntersectionsOptions = IntersectionObserverInit & {
  takeRecordsTrigger?: Observable<any>,
  observeTrigger?: Observable<Element>,
  unobserveTrigger?: Observable<Element>
};

export function observeIntersections(elements: Element | Element[], options: ObserveIntersectionsOptions = {}): Observable<IntersectionObserverEntry[]> {
  const { takeRecordsTrigger, observeTrigger, unobserveTrigger, ...init } = options;

  return new Observable<IntersectionObserverEntry[]>((subscriber) => {
    const observer = new IntersectionObserver((entries) => subscriber.next(entries), init);
    const subscriptions: Subscription[] = [];

    for (const element of toArray(elements)) {
      observer.observe(element);
    }

    if (isDefined(takeRecordsTrigger)) {
      subscriptions.push(takeRecordsTrigger.subscribe({ next: () => subscriber.next(observer.takeRecords()) }));
    }

    if (isDefined(observeTrigger)) {
      subscriptions.push(observeTrigger.subscribe({ next: (element) => observer.observe(element) }));
    }

    if (isDefined(unobserveTrigger)) {
      subscriptions.push(unobserveTrigger.subscribe({ next: (element) => observer.unobserve(element) }));
    }

    return () => {
      observer.disconnect();
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  });
}
