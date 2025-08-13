import type { TypedOmit } from '#/types/index.js';
import { Memoize } from '#/utils/function/memoize.js';
import { lazyObject } from '#/utils/object/index.js';
import { normalizeText } from '#/utils/string/index.js';
import { isNull } from '#/utils/type-guards.js';
import type { DocumentCategory } from '../../models/index.js';
import type { EnrichedDocumentManagementData } from './enriched-document-management-data.view.js';
import { EnrichedDocumentType } from './enriched-document-type.view.js';
import type { EnrichedDocument } from './enriched-document.view.js';

export class EnrichedDocumentCategory implements TypedOmit<DocumentCategory, 'parentId' | 'metadata'> {
  readonly #data: EnrichedDocumentManagementData;

  readonly id: string;
  readonly tenantId: string | null;
  readonly label: string;
  readonly parent: EnrichedDocumentCategory | null;

  readonly helper = lazyObject({
    normalizedLabel: () => normalizeText(this.label),
  });

  @Memoize()
  get rootCategory(): EnrichedDocumentCategory {
    return (this.parent?.rootCategory ?? this);
  }

  @Memoize()
  get parents(): EnrichedDocumentCategory[] {
    if (isNull(this.parent)) {
      return [];
    }

    return [this.parent, ...this.parent.parents];
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
    return this.#data.rawData.types.filter((type) => type.categoryId == this.id).map((type) => new EnrichedDocumentType(this.#data, type, this));
  }

  @Memoize()
  get typesDeep(): EnrichedDocumentType[] {
    return [this, ...this.childrenDeep].flatMap((category) => category.types);
  }

  @Memoize()
  get documents(): EnrichedDocument[] {
    return this.#data.documents.filter((document) => document.type?.category.id == this.id);
  }

  @Memoize()
  get documentsDeep(): EnrichedDocument[] {
    return [this, ...this.childrenDeep].flatMap((category) => category.documentsDeep);
  }

  constructor(data: EnrichedDocumentManagementData, category: DocumentCategory, parent: EnrichedDocumentCategory | null) {
    this.#data = data;

    this.id = category.id;
    this.tenantId = category.tenantId;
    this.label = category.label;
    this.parent = parent;
  }
}
