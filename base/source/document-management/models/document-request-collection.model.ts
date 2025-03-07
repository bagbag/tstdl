import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentCollection } from './document-collection.model.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentRequest } from './document-request.model.js';

@DocumentManagementTable()
@Unique<DocumentRequestCollection>(['requestId', 'collectionId'])
export class DocumentRequestCollection extends Entity {
  declare static readonly entityName: 'DocumentRequestCollection';

  @Uuid()
  @References(() => DocumentRequest)
  requestId: Uuid;

  @Uuid()
  @References(() => DocumentCollection)
  collectionId: Uuid;
}
