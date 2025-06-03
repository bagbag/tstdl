import type { TypedOmit } from '#/types.js';
import { Memoize } from '#/utils/function/memoize.js';
import type { DocumentCollectionView } from '../document-management.view-model.js';
import type { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';
import type { EnrichedDocumentRequest } from './enriched-document-request.view.js';
import type { EnrichedDocument } from './enriched-document.view.js';
import { calculateRequestsStats, mergeRequestsStats, type RequestsStats } from './enriched.js';

export class EnrichedDocumentCollection implements TypedOmit<DocumentCollectionView, 'parentId' | 'metadata'> {
  readonly #data: EnrichedDocumentManagementData;

  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly group: string | null;

  @Memoize()
  get parent(): EnrichedDocumentCollection | null {
    return this.#data.collections.find((collection) => collection.id == this.parentId) ?? null;
  }

  @Memoize()
  get children(): EnrichedDocumentCollection[] {
    return this.#data.collections.filter((collection) => collection.parent?.id == this.id);
  }

  @Memoize()
  get childrenDeep(): EnrichedDocumentCollection[] {
    return this.children.flatMap((child) => [child, ...child.childrenDeep]);
  }

  @Memoize()
  get documents(): EnrichedDocument[] {
    return this.#data.documents.filter((document) => document.assignments.collections.some((assignment) => assignment.collection.id == this.id));
  }

  @Memoize()
  get documentsDeep(): EnrichedDocument[] {
    return [...this.documents, ...this.children.flatMap((child) => child.documentsDeep)];
  }

  @Memoize()
  get requests(): EnrichedDocumentRequest[] {
    return this.#data.requests.filter((request) => request.collections.some((collection) => collection.id == this.id));
  }

  @Memoize()
  get requestsDeep(): EnrichedDocumentRequest[] {
    return [...this.requests, ...this.children.flatMap((child) => child.requestsDeep)];
  }

  @Memoize()
  get requestsStats(): RequestsStats {
    return calculateRequestsStats(this.requests);
  }

  @Memoize()
  get requestsStatsDeep(): RequestsStats {
    return mergeRequestsStats(this.children.map((child) => child.requestsStatsDeep));
  }

  constructor(data: EnrichedDocumentManagementData, collectionView: DocumentCollectionView) {
    this.#data = data;

    this.id = collectionView.id;
    this.parentId = collectionView.parentId;
    this.name = collectionView.name;
    this.group = collectionView.group;
  }
}
