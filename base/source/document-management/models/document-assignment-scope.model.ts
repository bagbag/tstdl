import { ForeignKey, References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentAssignmentTask } from './document-assignment-task.model.js';
import { DocumentCollection } from './document-collection.model.js';
import { DocumentManagementTable } from './document-management-table.js';

/**
 * Defines which collections or requests in these collections (depends on assignment task) are allowed to be assigned to a document in the assignment workflow.
 * This is used to prevent documents from being assigned to collections/requests that are out of scope/context.
 */
@DocumentManagementTable({ name: 'assignment_scope' })
@Unique<DocumentAssignmentScope>(['taskId', 'collectionId'])
@ForeignKey<DocumentAssignmentScope, DocumentAssignmentTask>(() => DocumentAssignmentTask, ['tenantId', 'taskId'], ['tenantId', 'id'])
@ForeignKey<DocumentAssignmentScope, DocumentCollection>(() => DocumentCollection, ['tenantId', 'collectionId'], ['tenantId', 'id'])
export class DocumentAssignmentScope extends Entity {
  declare static readonly entityName: 'DocumentAssignmentScope';

  @Uuid()
  tenantId: Uuid;

  @Uuid()
  @References(() => DocumentAssignmentTask)
  taskId: Uuid;

  @Uuid()
  @References(() => DocumentCollection)
  collectionId: Uuid;
}
