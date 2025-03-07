import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { NumericDate, Uuid } from '#/orm/types.js';
import { Array, Integer, string, StringProperty } from '#/schema/index.js';
import { DocumentFile } from './document-file.model.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentType } from './document-type.model.js';

@DocumentManagementTable()
export class Document extends Entity {
  @Uuid()
  @References(() => DocumentFile)
  fileId: Uuid;

  @Uuid({ nullable: true })
  @References(() => DocumentType)
  typeId: Uuid | null;

  @StringProperty({ nullable: true })
  title: string | null;

  @StringProperty({ nullable: true })
  subtitle: string | null;

  @Integer({ nullable: true })
  pages: number | null;

  @NumericDate({ nullable: true })
  date: NumericDate | null;

  @StringProperty({ nullable: true })
  summary: string | null;

  @Array(string(), { nullable: true })
  tags: string[] | null;
}
