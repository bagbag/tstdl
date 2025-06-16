import { computed, inject, Injector, signal, type ResourceStreamItem } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { resource } from '@tstdl/angular';
import type { BadgeColor } from '@tstdl/angular/badge';
import type { ButtonColor } from '@tstdl/angular/button';
import { CancellationToken } from '@tstdl/base/cancellation';
import { getDocumentManagementFolders, toEnrichedDocumentManagementData, type DocumentManagementData } from '@tstdl/base/document-management';
import { map } from '@tstdl/base/signals';
import { isUndefined } from '@tstdl/base/utils';
import { fromEntries, hasOwnProperty } from '@tstdl/base/utils/object';
import { patch, type Delta } from 'jsondiffpatch';
import { merge, map as rxjsMap, scan, takeUntil } from 'rxjs';

import { DocumentManagementApiService } from './api';
import { ForwardingDocumentManagementAuthorizationService } from './services';

const colors = [
  'amber',
  'lime',
  'cyan',
  'purple',
  'yellow',
  'green',
  'sky',
  'fuchsia',
  'emerald',
  'blue',
  'pink',
  'teal',
  'indigo',
  'rose',
] as const satisfies (BadgeColor & ButtonColor)[];

export class DocumentManagementContext {
  readonly #injector = inject(Injector);
  readonly api = inject(DocumentManagementApiService);
  readonly authorizationService = inject(ForwardingDocumentManagementAuthorizationService);
  readonly collectionIds = signal<string[]>([]);

  readonly rawData = resource({
    params: this.collectionIds,
    stream: async ({ params: collectionIds, abortSignal }) => {
      if (collectionIds.length == 0) {
        return computed(() => ({ value: undefined }));
      }

      const eventSource = await this.api.loadDataStream({ collectionIds });
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

  readonly folders = map(this.data, (data) => isUndefined(data) ? undefined : getDocumentManagementFolders(data));

  readonly hasValue = computed(() => this.rawData.hasValue());
  readonly isLoading = this.rawData.isLoading;

  readonly categoryColors = computed(() => {
    const entries = this.data()?.rootCategories.flatMap((category, index) => {
      const color = colors[index % colors.length]!;

      const children = category.childrenDeep.map((child) => [child.id, color] as const);
      return [[category.id, color], ...children] as const;
    });

    return fromEntries(entries ?? []);
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
