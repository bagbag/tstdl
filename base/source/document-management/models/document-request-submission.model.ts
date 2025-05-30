import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentRequest } from './document-request.model.js';
import { Document } from './document.model.js';

@DocumentManagementTable()
@Unique<DocumentRequestSubmission>(['requestId', 'documentId'])
export class DocumentRequestSubmission extends Entity {
  declare static readonly entityName: 'DocumentRequestSubmission';

  @Uuid()
  @References(() => DocumentRequest)
  requestId: Uuid;

  @Uuid()
  @References(() => Document)
  documentId: Uuid;
}
