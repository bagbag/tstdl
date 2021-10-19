import { isArray, isDefined, toArray } from '#/utils';
import type { Subscription } from 'rxjs';
import { Observable } from 'rxjs';

export type ObserveMutationsOptions = MutationObserverInit & {
  takeRecordsTrigger?: Observable<any>,
  observeTrigger?: Observable<Node | [Node, MutationObserverInit?]>
};

export function observeMutations(nodes: Node | (Node | [Node, MutationObserverInit?])[], options: ObserveMutationsOptions = {}): Observable<MutationRecord[]> {
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