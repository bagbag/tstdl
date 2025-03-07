import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentCollection } from './document-collection.model.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentRequestAssignmentTask } from './document-request-assignment-task.model.js';

@DocumentManagementTable()
@Unique<DocumentRequestAssignmentTaskCollection>(['requestAssignmentTaskId', 'collectionId'], { naming: 'abbreviated-table' })
export class DocumentRequestAssignmentTaskCollection extends Entity {
  declare static readonly entityName: 'DocumentRequestAssignmentTaskCollection';

  @Uuid()
  @References(() => DocumentRequestAssignmentTask)
  requestAssignmentTaskId: Uuid;

  @Uuid()
  @References(() => DocumentCollection)
  collectionId: Uuid;
}
