import { toArray } from '#/utils/array/array.js';
import { isArray, isDefined } from '#/utils/type-guards.js';
import type { Subscription } from 'rxjs';
import { Observable } from 'rxjs';

export type ObserveMutationOptions = MutationObserverInit & {
  takeRecordsTrigger?: Observable<any>,
  observeTrigger?: Observable<Node | [Node, MutationObserverInit?]>
};

export function observeMutation(nodes: Node | (Node | [Node, MutationObserverInit?])[], options: ObserveMutationOptions = {}): Observable<MutationRecord[]> {
  const { takeRecordsTrigger, observeTrigger, ...defaultInit } = options;

  return new Observable<MutationRecord[]>((subscriber) => {
    const observer = new MutationObserver((entries) => subscriber.next(entries));
    const subscriptions: Subscription[] = [];

    for (const node of toArray(nodes)) {
      observe(observer, node, defaultInit);
    }

    if (isDefined(takeRecordsTrigger)) {
      subscriptions.push(takeRecordsTrigger.subscribe({ next: () => subscriber.next(observer.takeRecords()) }));
    }

    if (isDefined(observeTrigger)) {
      subscriptions.push(observeTrigger.subscribe({ next: (node) => observe(observer, node, defaultInit) }));
    }

    return () => {
      observer.disconnect();
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  });
}

function observe(observer: MutationObserver, node: Node | [Node, MutationObserverInit?], defaultInit?: MutationObserverInit): void {
  if (isArray(node)) {
    observer.observe(node[0], node[1] ?? defaultInit);
  }
  else {
    observer.observe(node, defaultInit);
  }
}
