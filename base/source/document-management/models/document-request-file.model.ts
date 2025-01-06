import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Timestamp, Uuid } from '#/orm/types.js';
import { BooleanProperty, StringProperty } from '#/schema/index.js';
import { DocumentFile } from './document-file.model.js';
import { DocumentRequest } from './document-request.model.js';
import { Document } from './document.model.js';

export class DocumentRequestFile extends Entity {
  @Uuid()
  @References(() => DocumentRequest)
  requestId: Uuid;

  @Uuid()
  @References(() => DocumentFile)
  fileId: Uuid;

  @StringProperty({ nullable: true })
  addition: string | null;

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
