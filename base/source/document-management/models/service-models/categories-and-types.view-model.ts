import { Array } from '#/schema/index.js';

import { DocumentCategory } from '../document-category.model.js';
import { DocumentType } from '../document-type.model.js';

export class CategoryAndTypesView {
  @Array(DocumentCategory)
  categories: DocumentCategory[];

  @Array(DocumentType)
  types: DocumentType[];
}
