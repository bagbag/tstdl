import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Uuid } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import type { DocumentRequest } from './document-request.model.js';
import { DocumentRequestsTemplate } from './document-requests-template.js';
import { DocumentType } from './document-type.model.js';

@DocumentManagementTable()
export class DocumentRequestTemplate extends Entity implements Pick<DocumentRequest, 'typeId' | 'comment'> {
  @Uuid()
  @References(() => DocumentRequestsTemplate)
  requestsTemplateId: Uuid;

  @Uuid()
  @References(() => DocumentType)
  typeId: Uuid;

  @StringProperty({ nullable: true })
  comment: string | null;
}
