import { ForeignKey, References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Index, Timestamp, Unique, Uuid } from '#/orm/types.js';
import { DocumentCollection } from './document-collection.model.js';
import { DocumentManagementTable } from './document-management-table.js';
import { Document } from './document.model.js';

@DocumentManagementTable({ name: 'collection_assignment' })
@Unique<DocumentCollectionAssignment>(['tenantId', 'collectionId', 'documentId'])
@ForeignKey<DocumentCollectionAssignment, DocumentCollection>(() => DocumentCollection, ['tenantId', 'collectionId'], ['tenantId', 'id'])
@ForeignKey<DocumentCollectionAssignment, Document>(() => Document, ['tenantId', 'documentId'], ['tenantId', 'id'])
export class DocumentCollectionAssignment extends Entity {
  @Uuid()
  tenantId: Uuid;

  @Uuid()
  @References(() => DocumentCollection)
  @Index()
  collectionId: Uuid;

  @Uuid()
  @References(() => Document)
  documentId: Uuid;

  @Timestamp({ nullable: true })
  archiveTimestamp: Timestamp | null;
}
