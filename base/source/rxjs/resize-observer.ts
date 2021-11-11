import { isArray, isDefined, toArray } from '#/utils';
import type { Subscription } from 'rxjs';
import { Observable } from 'rxjs';

export type ObserveResizeOptions = ResizeObserverOptions & {
  observeTrigger?: Observable<Element>,
  unobserveTrigger?: Observable<Element>
};

export function observeResize(elements: Element | (Element | [Element, ResizeObserverOptions])[], options: ObserveResizeOptions = {}): Observable<ResizeObserverEntry[]> {
  const { observeTrigger, unobserveTrigger, ...defaultOptions } = options;

  return new Observable<ResizeObserverEntry[]>((subscriber) => {
    const observer = new ResizeObserver((entries) => subscriber.next(entries));
    const subscriptions: Subscription[] = [];

    for (const element of toArray(elements)) {
      observe(observer, element, defaultOptions);
    }

    if (isDefined(observeTrigger)) {
      subscriptions.push(observeTrigger.subscribe({ next: (element) => observe(observer, element, defaultOptions) }));
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

function observe(observer: ResizeObserver, element: Element | [Element, ResizeObserverOptions?], defaultOptions?: ResizeObserverOptions): void {
  if (isArray(element)) {
    observer.observe(element[0], element[1] ?? defaultOptions);
  }
  else {
    observer.observe(element, defaultOptions);
  }
}
