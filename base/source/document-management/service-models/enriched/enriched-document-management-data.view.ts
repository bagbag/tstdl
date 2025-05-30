import { getEntityMap } from '#/orm/utils.js';
import { Memoize } from '#/utils/function/memoize.js';
import { group } from '#/utils/iterable-helpers/group.js';
import { lazyObject } from '#/utils/object/lazy-property.js';
import { isNull } from '#/utils/type-guards.js';
import type { DocumentManagementData } from '../document-management.view-model.js';
import { EnrichedDocumentCategory } from './enriched-document-category.view.js';
import { EnrichedDocumentCollection } from './enriched-document-collection.view.js';
import { EnrichedDocumentRequest } from './enriched-document-request.view.js';
import type { EnrichedDocumentType } from './enriched-document-type.view.js';
import { EnrichedDocument } from './enriched-document.view.js';
import { type RequestsStats, calculateRequestsStats, mergeRequestsStats } from './enriched.js';

export class EnrichedCollectionsGroup {
  readonly group: string | null;
  readonly collections: EnrichedDocumentCollection[];

  @Memoize()
  get requestsStats(): RequestsStats {
    return mergeRequestsStats(this.collections.map((collection) => collection.requestsStats));
  }

  constructor(group: string | null, collections: EnrichedDocumentCollection[]) {
    this.group = group;
    this.collections = collections;
  }
};

export class EnrichedDocumentManagementData {
  readonly rawData: DocumentManagementData;
  readonly rawDataMaps = lazyObject({
    collections: () => getEntityMap(this.rawData.collections),
    documents: () => getEntityMap(this.rawData.documents),
    requests: () => getEntityMap(this.rawData.requests),
    categories: () => getEntityMap(this.rawData.categories),
    types: () => getEntityMap(this.rawData.types),
  });

  readonly maps = lazyObject({
    collections: () => getEntityMap(this.collections),
    documents: () => getEntityMap(this.documents),
    requests: () => getEntityMap(this.requests),
    categories: () => getEntityMap(this.categories),
    types: () => getEntityMap(this.types),
  });

  @Memoize()
  get collectionIds(): string[] {
    return this.rawData.collections.map((collection) => collection.id);
  }

  @Memoize()
  get rootCollections(): EnrichedDocumentCollection[] {
    return this.rawData.collections.filter((collection) => isNull(collection.parentId)).map((collection) => new EnrichedDocumentCollection(this, collection, null));
  }

  @Memoize()
  get collections(): EnrichedDocumentCollection[] {
    return this.rootCollections.flatMap((collection) => [collection, ...collection.childrenDeep]);
  }

  @Memoize()
  get collectionGroups(): EnrichedCollectionsGroup[] {
    const groups = [...group(this.collections, (collection) => collection.group)];
    return groups.map(([group, collections]) => new EnrichedCollectionsGroup(group, collections));
  }

  @Memoize()
  get documents(): EnrichedDocument[] {
    return this.rawData.documents.map((document) => new EnrichedDocument(this, document));
  }

  @Memoize()
  get requests(): EnrichedDocumentRequest[] {
    return this.rawData.requests.map((request) => new EnrichedDocumentRequest(this, request));
  }

  @Memoize()
  get rootCategories(): EnrichedDocumentCategory[] {
    return this.rawData.categories.filter((category) => isNull(category.parentId)).map((category) => new EnrichedDocumentCategory(this, category, null));
  }

  @Memoize()
  get categories(): EnrichedDocumentCategory[] {
    return this.rootCategories.flatMap((category) => [category, ...category.childrenDeep]);
  }

  @Memoize()
  get types(): EnrichedDocumentType[] {
    return this.categories.flatMap((category) => category.types);
  }

  @Memoize()
  get requestsStats(): RequestsStats {
    return calculateRequestsStats(this.requests);
  }

  constructor(data: DocumentManagementData) {
    this.rawData = data;
  }
}
