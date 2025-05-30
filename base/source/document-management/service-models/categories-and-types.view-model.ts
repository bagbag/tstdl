import { Array, deferred } from '#/schema/index.js';
import { DocumentCategory, DocumentType } from '../models/index.js';

export class DocumentCategoryView extends DocumentCategory {
  @Array(deferred(() => DocumentCategoryView))
  children: DocumentCategoryView[];

  @Array(DocumentType)
  types: DocumentType[];
}
