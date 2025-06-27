import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { ForeignKey, References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Timestamp, Unique, Uuid } from '#/orm/types.js';
import { Enumeration, StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentValidationDefinition } from './document-validation-definition.model.js';
import { DocumentWorkflow } from './document-workflow.model.js';

export const DocumentValidationExecutionState = defineEnum('DocumentValidationExecutionState', {
  Pending: 'pending',
  Running: 'running',
  Completed: 'completed',
  Error: 'error',
});

export type DocumentValidationExecutionState = EnumType<typeof DocumentValidationExecutionState>;

export const DocumentValidationResultStatus = defineEnum('DocumentValidationResultStatus', {
  Passed: 'passed',
  Failed: 'failed',
  Warning: 'warning',
});

export type DocumentValidationResultStatus = EnumType<typeof DocumentValidationResultStatus>;

@DocumentManagementTable({ name: 'validation_execution' })
@Unique<DocumentValidationExecution>(['tenantId', 'id'])
@Unique<DocumentValidationExecution>(['tenantId', 'workflowId', 'definitionId'])
@ForeignKey<DocumentValidationExecution, DocumentWorkflow>(() => DocumentWorkflow, ['tenantId', 'workflowId'], ['tenantId', 'id'])
export class DocumentValidationExecution extends Entity {
  declare static readonly entityName: 'DocumentValidationExecution';

  @Uuid()
  tenantId: Uuid;

  @Uuid()
  @References(() => DocumentWorkflow)
  workflowId: Uuid;

  @Uuid()
  @References(() => DocumentValidationDefinition)
  definitionId: Uuid;

  @Enumeration(DocumentValidationExecutionState)
  state: DocumentValidationExecutionState;

  @Enumeration(DocumentValidationResultStatus, { nullable: true })
  resultStatus: DocumentValidationResultStatus | null;

  @StringProperty({ nullable: true })
  resultMessage: string | null;

  @Timestamp({ nullable: true })
  startedAt: Timestamp | null;

  @Timestamp({ nullable: true })
  completedAt: Timestamp | null;
}
