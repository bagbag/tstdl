import { Memoize } from '#/utils/function/memoize.js';
import type { DocumentCategory } from '../../models/index.js';
import type { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';
import { EnrichedDocumentType } from './enriched-document-type.view.js';

export class EnrichedDocumentCategory implements Pick<DocumentCategory, 'id' | 'label'> {
  readonly #data: EnrichedDocumentManagementData;

  readonly id: string;
  readonly label: string;
  readonly parent: EnrichedDocumentCategory | null;

  @Memoize()
  get rootCategory(): EnrichedDocumentCategory {
    return (this.parent?.rootCategory ?? this);
  }

  @Memoize()
  get children(): EnrichedDocumentCategory[] {
    return this.#data.rawData.categories.filter((category) => category.parentId == this.id).map((category) => new EnrichedDocumentCategory(this.#data, category, this));
  }

  @Memoize()
  get childrenDeep(): EnrichedDocumentCategory[] {
    return this.children.flatMap((child) => [child, ...child.childrenDeep]);
  }

  @Memoize()
  get types(): EnrichedDocumentType[] {
    return this.#data.rawData.types.filter((type) => type.categoryId == this.id).map((type) => new EnrichedDocumentType(type, this));
  }

  constructor(data: EnrichedDocumentManagementData, category: DocumentCategory, parent: EnrichedDocumentCategory | null) {
    this.#data = data;

    this.id = category.id;
    this.label = category.label;
    this.parent = parent;
  }
}
