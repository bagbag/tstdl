import type { EntityMetadata } from '#/orm/entity.js';
import type { TypedOmit } from '#/types/index.js';
import { Memoize } from '#/utils/function/memoize.js';
import { assertDefinedPass, isNull } from '#/utils/type-guards.js';
import type { DocumentApproval, DocumentTag, DocumentValidationExecution, DocumentWorkflow } from '../../models/index.js';
import type { DocumentPropertyValueView, DocumentView } from '../document-management.view-model.js';
import { EnrichedDocumentAssignment } from './enriched-document-assignment.view.js';
import type { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';
import type { EnrichedDocumentType } from './enriched-document-type.view.js';

export class EnrichedDocument implements TypedOmit<DocumentView, 'typeId' | 'assignment' | 'tagIds' | 'createUserId'> {
  readonly #data: EnrichedDocumentManagementData;
  readonly #documentView: DocumentView;

  readonly id: string;
  readonly tenantId: string;
  readonly title: string | null;
  readonly subtitle: string | null;
  readonly pages: number | null;
  readonly date: number | null;
  readonly summary: string | null;
  readonly approval: DocumentApproval;
  readonly comment: string | null;
  readonly originalFileName: string | null;
  readonly mimeType: string;
  readonly hash: string;
  readonly size: number;
  readonly workflows: DocumentWorkflow[];
  readonly validations: DocumentValidationExecution[];
  readonly metadata: EntityMetadata;

  @Memoize()
  get type(): EnrichedDocumentType | null {
    if (isNull(this.#documentView.typeId)) {
      return null;
    }

    return assertDefinedPass(this.#data.maps.types.get(this.#documentView.typeId));
  }

  @Memoize()
  get assignments(): EnrichedDocumentAssignment {
    return new EnrichedDocumentAssignment(
      this.#data,
      this,
      this.#documentView.assignment
    );
  }

  @Memoize()
  get tags(): DocumentTag[] {
    return this.#documentView.tagIds.map((tagId) => assertDefinedPass(this.#data.rawDataMaps.tags.get(tagId), `Tag ${tagId} not found.`));
  }

  @Memoize()
  get properties(): DocumentPropertyValueView[] {
    return this.#documentView.properties.map((documentPropertyValueView) => {
      const property = assertDefinedPass(this.#data.rawDataMaps.properties.get(documentPropertyValueView.propertyId), `Property ${documentPropertyValueView.propertyId} not found.`);

      return {
        documentId: this.id,
        propertyId: property.id,
        label: property.label,
        dataType: property.dataType,
        value: documentPropertyValueView.value ?? null,
      };
    });
  }

  constructor(data: EnrichedDocumentManagementData, document: DocumentView) {
    this.#data = data;
    this.#documentView = document;

    this.id = document.id;
    this.tenantId = document.tenantId;
    this.title = document.title;
    this.subtitle = document.subtitle;
    this.pages = document.pages;
    this.date = document.date;
    this.summary = document.summary;
    this.approval = document.approval;
    this.comment = document.comment;
    this.originalFileName = document.originalFileName;
    this.mimeType = document.mimeType;
    this.hash = document.hash;
    this.size = document.size;
    this.workflows = document.workflows;
    this.validations = document.validations;
    this.metadata = document.metadata;
  }
}
