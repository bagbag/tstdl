import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { Enumeration } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import { Document } from './document.model.js';

export const DocumentAssignmentTarget = defineEnum('DocumentAssignmentTarget', {
  Collection: 'collection',
  Request: 'request',
});

export type DocumentAssignmentTarget = EnumType<typeof DocumentAssignmentTarget>;

@DocumentManagementTable()
export class DocumentAssignmentTask extends Entity {
  declare static readonly entityName: 'DocumentAssignmentTask';

  @Uuid()
  @References(() => Document)
  @Unique()
  documentId: Uuid;

  @Enumeration(DocumentAssignmentTarget)
  target: DocumentAssignmentTarget;
}
