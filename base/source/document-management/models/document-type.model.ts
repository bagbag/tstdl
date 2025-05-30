import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentCategory } from './document-category.model.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable()
@Unique<DocumentType>(['categoryId', 'label'])
export class DocumentType extends Entity {
  declare static readonly entityName: 'DocumentType';

  @Uuid()
  @References(() => DocumentCategory)
  categoryId: Uuid;

  @StringProperty()
  label: string;
}
