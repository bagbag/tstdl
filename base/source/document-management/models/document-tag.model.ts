import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable({ name: 'tag' })
@Unique<DocumentTag>(['tenantId', 'label'])
export class DocumentTag extends Entity {
  declare static readonly entityName: 'DocumentTag';

  @Uuid({ nullable: true })
  tenantId: string | null;

  @StringProperty()
  label: string;
}
