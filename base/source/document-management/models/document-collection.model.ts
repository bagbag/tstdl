import { Entity } from '#/orm/entity.js';
import { References, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable()
export class DocumentCollection extends Entity {
  @Uuid({ nullable: true })
  @References(() => DocumentCollection)
  parentId: Uuid | null;
}
