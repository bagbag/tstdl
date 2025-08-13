import type { TypedOmit } from '#/types/index.js';
import { Memoize } from '#/utils/function/memoize.js';
import { assertDefinedPass } from '#/utils/type-guards.js';
import type { DocumentRequestState } from '../../models/index.js';
import type { DocumentRequestView } from '../document-management.view-model.js';
import type { EnrichedDocumentCollection } from './enriched-document-collection.view.js';
import type { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';
import type { EnrichedDocumentType } from './enriched-document-type.view.js';
import type { EnrichedDocument } from './enriched-document.view.js';

export class EnrichedDocumentRequest implements TypedOmit<DocumentRequestView, 'typeId' | 'documentId' | 'collectionIds' | 'metadata'> {
  readonly #data: EnrichedDocumentManagementData;
  readonly #documentRequestView: DocumentRequestView;

  readonly id: string;
  readonly tenantId: string;
  readonly comment: string | null;
  readonly state: DocumentRequestState;

  @Memoize()
  get type(): EnrichedDocumentType {
    return assertDefinedPass(this.#data.types.find((type) => type.id == this.#documentRequestView.typeId));
  }

  @Memoize()
  get document(): EnrichedDocument | null {
    if (this.#documentRequestView.documentId == null) {
      return null;
    }

    return assertDefinedPass(this.#data.documents.find((document) => document.id == this.#documentRequestView.documentId));
  }

  @Memoize()
  get collections(): EnrichedDocumentCollection[] {
    return this.#documentRequestView.collectionIds.map((collectionId) => assertDefinedPass(this.#data.collections.find((collection) => collection.id == collectionId)));
  }

  constructor(data: EnrichedDocumentManagementData, request: DocumentRequestView) {
    this.#data = data;
    this.#documentRequestView = request;

    this.id = request.id;
    this.tenantId = request.tenantId;
    this.comment = request.comment;
    this.state = request.state;
  }
}
