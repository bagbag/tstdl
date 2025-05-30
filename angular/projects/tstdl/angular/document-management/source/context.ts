import { computed, inject, Injector, signal, type ResourceStreamItem } from '@angular/core';
import { resource } from '@tstdl/angular';
import type { BadgeColor } from '@tstdl/angular/badge';
import { toEnrichedDocumentManagementData, type DocumentManagementData } from '@tstdl/base/document-management';
import { map } from '@tstdl/base/signals';
import { isUndefined } from '@tstdl/base/utils';
import { fromEntries, hasOwnProperty } from '@tstdl/base/utils/object';
import { patch, type Delta } from 'jsondiffpatch';
import { merge, map as rxjsMap, scan, takeUntil } from 'rxjs';

import { toSignal } from '@angular/core/rxjs-interop';
import { CancellationToken } from '@tstdl/base/cancellation';
import { DocumentManagementApiService } from './api';

const colors: BadgeColor[] = [
  'yellow',
  'amber',
  'green',
  'lime',
  'blue',
  'sky',
  'cyan',
  'teal',
  'emerald',
  'indigo',
  'purple',
  'pink',
  'fuchsia',
  'rose'
] as const;

export class DocumentManagementContext {
  readonly #injector = inject(Injector);
  readonly api = inject(DocumentManagementApiService);
  readonly collectionIds = signal<string[]>([]);

  readonly rawData = resource({
    request: this.collectionIds,
    stream: async ({ request, abortSignal }) => {
      const eventSource = await this.api.loadDataStream({ collectionIds: request });
      abortSignal.addEventListener('abort', () => eventSource.close());

      const data$ = eventSource.message$('data').pipe(rxjsMap((message) => ({ data: JSON.parse(message.data) as DocumentManagementData })));
      const delta$ = eventSource.message$('delta').pipe(rxjsMap((message) => ({ delta: JSON.parse(message.data) as Delta })));

      const cancelToken = CancellationToken.from(abortSignal);

      const resourceStreamItem$ = merge(data$, delta$).pipe(
        takeUntil(cancelToken.set$),
        scan((data, message) => {
          if (hasOwnProperty(message, 'data')) {
            return message.data;
          }

          return patch(structuredClone(data), message.delta) as DocumentManagementData;
        }, undefined as DocumentManagementData | undefined),
        rxjsMap((value): ResourceStreamItem<DocumentManagementData | undefined> => ({ value }))
      );

      return toSignal(
        resourceStreamItem$,
        { injector: this.#injector, initialValue: { value: undefined } satisfies ResourceStreamItem<DocumentManagementData | undefined> }
      );
    },
    // loader: async ({ request }) => (request.length == 0) ? undefined : await this.api.loadData({ collectionIds: request }),
  });

  readonly data = map(this.rawData.value, (data) => isUndefined(data) ? undefined : toEnrichedDocumentManagementData(data));

  readonly hasValue = computed(() => this.rawData.hasValue());
  readonly isLoading = this.rawData.isLoading;

  readonly categoryColors = computed(() => {
    const entries = this.data()?.rootCategories.map((category, index) => {
      return [category.id, colors[index % colors.length]!] as const;
    });

    return fromEntries(entries ?? []) as Record<string, BadgeColor>;
  });

  constructor(collectionIds: string[]) {
    this.collectionIds.set(collectionIds);
  }

  reload(): void {
    this.rawData.reload();
  }
}

export function documentManagementContext(collectionIds: string[]): DocumentManagementContext {
  return new DocumentManagementContext(collectionIds);
}
