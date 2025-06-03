import type { TypedOmit } from '#/types.js';
import { Memoize } from '#/utils/function/memoize.js';
import { lazyObject } from '#/utils/object/index.js';
import { normalizeText } from '#/utils/string/index.js';
import type { DocumentType } from '../../models/index.js';
import type { DocumentPropertyView } from '../document-management.view-model.js';
import type { EnrichedDocumentCategory } from './enriched-document-category.view.js';
import type { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';

export class EnrichedDocumentType implements TypedOmit<DocumentType, 'categoryId' | 'metadata'> {
  readonly #data: EnrichedDocumentManagementData;

  readonly id: string;
  readonly label: string;
  readonly category: EnrichedDocumentCategory;

  readonly helper = lazyObject({
    normalizedLabel: () => normalizeText(this.label),
  });

  @Memoize()
  get properties(): DocumentPropertyView[] {
    return this.#data.rawData.properties.filter((property) => property.typeIds.includes(this.id));
  }

  constructor(data: EnrichedDocumentManagementData, type: DocumentType, category: EnrichedDocumentCategory) {
    this.#data = data;
    this.id = type.id;
    this.label = type.label;
    this.category = category;
  }
}
