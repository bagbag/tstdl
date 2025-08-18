import { computed, inject, Injector, signal, type ResourceStreamItem } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { resource } from '@tstdl/angular';
import type { BadgeColor } from '@tstdl/angular/badge';
import type { ButtonColor } from '@tstdl/angular/button';
import { CancellationToken } from '@tstdl/base/cancellation';
import { getDocumentManagementFolders, toEnrichedDocumentManagementData, type DocumentManagementData } from '@tstdl/base/document-management';
import { map } from '@tstdl/base/signals';
import { isUndefined } from '@tstdl/base/utils';
import { fromEntries } from '@tstdl/base/utils/object';
import { normalizeText } from '@tstdl/base/utils/string';
import { map as rxjsMap, takeUntil } from 'rxjs';

import { DocumentManagementApiService } from './api';
import { DocumentFilter } from './filter';
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
  readonly filter = new DocumentFilter();

  readonly rawData = resource({
    params: this.collectionIds,
    stream: async ({ params: collectionIds, abortSignal }) => {
      if (collectionIds.length == 0) {
        return computed(() => ({ value: undefined }));
      }

      const data$ = await this.api.loadDataStream({ collectionIds });

      const cancelToken = CancellationToken.from(abortSignal);

      const resourceStreamItem$ = data$.pipe(
        takeUntil(cancelToken.set$),
        rxjsMap((value): ResourceStreamItem<DocumentManagementData | undefined> => ({ value }))
      );

      return toSignal(
        resourceStreamItem$,
        { injector: this.#injector, initialValue: { value: undefined } satisfies ResourceStreamItem<DocumentManagementData | undefined> }
      );
    },
  });

  readonly data = map(this.rawData.value, (data) => isUndefined(data) ? undefined : toEnrichedDocumentManagementData(data));
  readonly folders = map(this.data, (data) => isUndefined(data) ? undefined : getDocumentManagementFolders(data));

  readonly filteredDocuments = map(this.data, (data) => {
    const searchTexts = normalizeText(this.filter.searchText() ?? '').split(' ').map((text) => text.trim()).filter((text) => text.length > 0);
    const collections = this.filter.collections();
    const categories = this.filter.categories();
    const types = this.filter.types();
    const tags = this.filter.tags();

    return data?.documents.filter((document) => {
      if (collections.length > 0) {
        const hasCollection = document.assignments.collections.some((assignment) => collections.includes(assignment.collection.id));

        if (!hasCollection) {
          return false;
        }
      }

      if (categories.length > 0) {
        const hasCategory = categories.includes(document.type?.category.id!);

        if (!hasCategory) {
          return false;
        }
      }

      if (types.length > 0) {
        const hasType = types.includes(document.type?.id!);

        if (!hasType) {
          return false;
        }
      }

      if (tags.length > 0) {
        const hasTag = document.tags.some((tag) => tags.includes(tag.id));

        if (!hasTag) {
          return false;
        }
      }

      if (searchTexts.length > 0) {
        const collectionTexts = document.assignments.collections.map((assignment) => assignment.collection.name);
        const categoryText = document.type?.category.label ?? '';
        const typeText = document.type?.label ?? '';
        const tagTexts = document.tags.map((tag) => tag.label);
        const propertyTexts = document.properties.map((property) => String(property.value));
        const documentText = normalizeText([document.title, document.subtitle, document.summary, document.comment, ...collectionTexts, categoryText, typeText, ...tagTexts, ...propertyTexts].join(' '));
        const normalizedDocumentText = normalizeText(documentText);

        for (const searchText of searchTexts) {
          if (!normalizedDocumentText.includes(searchText)) {
            return false;
          }
        }
      }

      return true;
    });
  });

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
