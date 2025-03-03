import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { NumericDate, Unique, Uuid } from '#/orm/types.js';
import { Array, Integer, string, StringProperty } from '#/schema/index.js';
import { DocumentFile } from './document-file.model.js';
import { DocumentRequestFile } from './document-request-file.model.js';
import { DocumentType } from './document-type.model.js';

export class DocumentRequestAssignmentTask extends Entity {
  @Uuid()
  @References(() => DocumentFile)
  @Unique(undefined, { naming: 'abbreviated-table' })
  fileId: Uuid;

  @Uuid({ nullable: true })
  @References(() => DocumentRequestFile)
  assignedRequestFileId: Uuid | null;

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

  @Integer()
  assignmentTries: number;
}
