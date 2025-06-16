import { Entity } from '#/orm/entity.js';
import { References, Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable({ name: 'collection' })
@Unique<DocumentCollection>(['tenantId', 'id'])
export class DocumentCollection extends Entity {
  declare static readonly entityName: 'DocumentCollection';

  @Uuid()
  tenantId: Uuid;

  @Uuid({ nullable: true })
  @References(() => DocumentCollection)
  parentId: Uuid | null;
}
