import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Uuid } from '#/orm/types.js';
import { Integer, StringProperty } from '#/schema/index.js';
import type { TypedOmit } from '#/types.js';
import type { DocumentRequest } from './document-request.model.js';
import { DocumentRequestsTemplate } from './document-requests-template.js';
import { DocumentType } from './document-type.model.js';

export class DocumentRequestTemplate extends Entity implements TypedOmit<DocumentRequest, 'completed'> {
  @Uuid()
  @References(() => DocumentRequestsTemplate)
  requestsTemplateId: Uuid;

  @Uuid({ nullable: true })
  @References(() => DocumentType)
  typeId: Uuid | null;

  @Integer()
  requiredFilesCount: number;

  @StringProperty({ nullable: true })
  comment: string | null;
}
