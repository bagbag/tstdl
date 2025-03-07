import { Entity } from '#/orm/entity.js';
import { Unique } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable()
export class DocumentRequestsTemplate extends Entity {
  @StringProperty()
  @Unique()
  label: string;

  @StringProperty({ nullable: true })
  description: string | null;
}
