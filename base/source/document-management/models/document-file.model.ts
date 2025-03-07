import { Entity } from '#/orm/entity.js';
import { Integer, StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';

@DocumentManagementTable()
export class DocumentFile extends Entity {
  @StringProperty({ nullable: true })
  originalFileName: string | null;

  @StringProperty()
  mimeType: string;

  @StringProperty()
  hash: string;

  @Integer()
  size: number;
}
