import { Entity } from '#/orm/entity.js';
import { Unique } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable()
export class DocumentCategory extends Entity {
  declare static readonly entityName: 'DocumentCategory';

  @StringProperty()
  @Unique()
  label: string;
}
