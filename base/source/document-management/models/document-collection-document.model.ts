import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Timestamp, Unique, Uuid } from '#/orm/types.js';
import { DocumentCollection } from './document-collection.model.js';
import { Document } from './document.model.js';

@Unique<DocumentCollectionDocument>(['collectionId', 'documentId'])
export class DocumentCollectionDocument extends Entity {
  @Uuid()
  @References(() => DocumentCollection)
  collectionId: Uuid;

  @Uuid()
  @References(() => Document)
  documentId: Uuid;

  @Timestamp({ nullable: true })
  archiveTimestamp: Timestamp | null;
}
