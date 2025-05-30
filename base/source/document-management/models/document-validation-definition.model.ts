import { Entity } from '#/orm/entity.js';
import { Json } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import type { Record } from '#/types.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable()
export class DocumentValidationDefinition extends Entity {
  declare static readonly entityName: 'DocumentValidationDefinition';

  @StringProperty()
  identifier: string;

  @StringProperty()
  label: string;

  @StringProperty({ nullable: true })
  description: string | null;

  @Json()
  configuration: Json<Record<string, unknown>>;
}
