import { Entity } from '#/orm/entity.js';
import { References, Unique, Uuid } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable({ name: 'category' })
@Unique<DocumentCategory>(['tenantId', 'parentId', 'label'])
export class DocumentCategory extends Entity {
  declare static readonly entityName: 'DocumentCategory';

  @Uuid({ nullable: true })
  tenantId: string | null;

  @Uuid({ nullable: true })
  @References(() => DocumentCategory)
  parentId: Uuid | null;

  @StringProperty()
  @Unique()
  label: string;
}
