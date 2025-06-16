import { Entity } from '#/orm/entity.js';
import { Uuid } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable({ name: 'requests_template' })
export class DocumentRequestsTemplate extends Entity {
  @Uuid({ nullable: true })
  tenantId: string | null;

  @StringProperty()
  label: string;

  @StringProperty({ nullable: true })
  description: string | null;
}
