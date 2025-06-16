import { ForeignKey } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { References, Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentTag } from './document-tag.model.js';
import { Document } from './document.model.js';

@DocumentManagementTable({ name: 'tag_assignment' })
@Unique<DocumentTagAssignment>(['tenantId', 'documentId', 'tagId'])
@ForeignKey<DocumentTagAssignment, Document>(() => Document, ['tenantId', 'documentId'], ['tenantId', 'id'])
export class DocumentTagAssignment extends Entity {
  declare static readonly entityName: 'DocumentTagAssignment';

  @Uuid()
  tenantId: Uuid;

  @Uuid()
  @References(() => Document)
  documentId: Uuid;

  @Uuid()
  @References(() => DocumentTag)
  tagId: Uuid;
}
