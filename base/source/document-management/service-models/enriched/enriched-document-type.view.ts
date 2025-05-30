import type { TypedOmit } from '#/types.js';
import type { DocumentType } from '../../models/index.js';
import type { EnrichedDocumentCategory } from './enriched-document-category.view.js';

export class EnrichedDocumentType implements TypedOmit<DocumentType, 'categoryId' | 'metadata'> {
  readonly id: string;
  readonly label: string;
  readonly category: EnrichedDocumentCategory;

  constructor(type: DocumentType, category: EnrichedDocumentCategory) {
    this.id = type.id;
    this.label = type.label;
    this.category = category;
  }
}
