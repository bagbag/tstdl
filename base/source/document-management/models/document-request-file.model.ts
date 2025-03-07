import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { NumericDate, Timestamp, Uuid } from '#/orm/types.js';
import { Array, BooleanProperty, Integer, string, StringProperty } from '#/schema/index.js';
import { DocumentFile } from './document-file.model.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentRequest } from './document-request.model.js';
import { Document } from './document.model.js';

@DocumentManagementTable()
export class DocumentRequestFile extends Entity {
  @Uuid()
  @References(() => DocumentRequest)
  requestId: Uuid;

  @Uuid()
  @References(() => DocumentFile)
  fileId: Uuid;

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

  @Uuid({ nullable: true })
  @References(() => Document)
  createdDocumentId: Uuid | null;

  @BooleanProperty({ nullable: true })
  approval: boolean | null;

  @StringProperty({ nullable: true })
  approvalComment: string | null;

  @Timestamp({ nullable: true })
  approvalTimestamp: Timestamp | null;
}
