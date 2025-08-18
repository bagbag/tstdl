import { patch, type Delta } from 'jsondiffpatch';

import { hasOwnProperty } from '#/utils/object/object.js';
import { finalize, map, merge, scan, type Observable } from 'rxjs';
import type { ServerSentEvents } from './server-sent-events.js';

declare const dataStreamType: unique symbol;

export class DataStream<T> { // eslint-disable-line @typescript-eslint/no-unnecessary-type-parameters
  declare readonly [dataStreamType]?: T;

  static parse<T>(eventSource: ServerSentEvents): Observable<T> {
    const data$ = eventSource.message$('data').pipe(map((message) => ({ data: JSON.parse(message.data) as T })));
    const delta$ = eventSource.message$('delta').pipe(map((message) => ({ delta: JSON.parse(message.data) as Delta })));

    return merge(data$, delta$).pipe(
      scan((data, message) => {
        if (hasOwnProperty(message, 'data')) {
          return message.data;
        }

        return patch(structuredClone(data), message.delta) as T;
      }, undefined as T),
      finalize(() => eventSource.close()),
    );
  }
}
