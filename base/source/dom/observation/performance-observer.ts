import { toArray } from '#/utils/array/array.js';
import { isDefined } from '#/utils/type-guards.js';
import type { Subscription } from 'rxjs';
import { Observable } from 'rxjs';

export type ObservePerformanceOptions = {
  takeRecordsTrigger?: Observable<any>,
  observeTrigger?: Observable<PerformanceObserverInit>
};

export interface PerformanceObserverEntryListLike extends PerformanceObserverEntryList { }

export function observePerformance$(inits?: PerformanceObserverInit | PerformanceObserverInit[], options: ObservePerformanceOptions = {}): Observable<PerformanceObserverEntryListLike> {
  const { takeRecordsTrigger, observeTrigger } = options;

  return new Observable<PerformanceObserverEntryListLike>((subscriber) => {
    const observer = new PerformanceObserver((entries) => subscriber.next(entries));
    const subscriptions: Subscription[] = [];

    for (const init of toArray(inits)) {
      observer.observe(init);
    }

    if (isDefined(takeRecordsTrigger)) {
      subscriptions.push(takeRecordsTrigger.subscribe({ next: () => subscriber.next(convertPerformanceEntryList(observer.takeRecords())) }));
    }

    if (isDefined(observeTrigger)) {
      subscriptions.push(observeTrigger.subscribe({ next: (init) => observer.observe(init) }));
    }

    return () => {
      observer.disconnect();
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  });
}

function convertPerformanceEntryList(list: PerformanceEntryList): PerformanceObserverEntryListLike {
  return {
    getEntries() {
      return list;
    },
    getEntriesByName(name: string, type?: string) {
      const filteredByName = list.filter((entry) => entry.name == name);

      if (isDefined(type)) {
        return filteredByName.filter((entry) => entry.entryType == type);
      }

      return filteredByName;
    },
    getEntriesByType(type: string) {
      return list.filter((entry) => entry.entryType == type);
    }
  };
}
