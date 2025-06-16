import { ForeignKey, References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Index, Unique, Uuid } from '#/orm/types.js';
import { DocumentCollection } from './document-collection.model.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentRequest } from './document-request.model.js';

@DocumentManagementTable({ name: 'request_collection_assignment' })
@Unique<DocumentRequestCollectionAssignment>(['tenantId', 'requestId', 'collectionId'])
@ForeignKey<DocumentRequestCollectionAssignment, DocumentRequest>(() => DocumentRequest, ['tenantId', 'requestId'], ['tenantId', 'id'])
@ForeignKey<DocumentRequestCollectionAssignment, DocumentCollection>(() => DocumentCollection, ['tenantId', 'collectionId'], ['tenantId', 'id'])
export class DocumentRequestCollectionAssignment extends Entity {
  declare static readonly entityName: 'DocumentRequestCollectionAssignment';

  @Uuid()
  tenantId: Uuid;

  @Uuid()
  @References(() => DocumentRequest)
  requestId: Uuid;

  @Uuid()
  @References(() => DocumentCollection)
  @Index()
  collectionId: Uuid;
}
