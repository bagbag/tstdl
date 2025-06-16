import { ForeignKey, References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentValidationExecution } from './document-validation-execution.model.js';
import { Document } from './document.model.js';

@DocumentManagementTable({ name: 'validation_execution_related_document' })
@Unique<DocumentValidationExecutionRelatedDocument>(['tenantId', 'executionId', 'documentId'])
@ForeignKey<DocumentValidationExecutionRelatedDocument, DocumentValidationExecution>(() => DocumentValidationExecution, ['tenantId', 'executionId'], ['tenantId', 'id'])
@ForeignKey<DocumentValidationExecutionRelatedDocument, Document>(() => Document, ['tenantId', 'documentId'], ['tenantId', 'id'])
export class DocumentValidationExecutionRelatedDocument extends Entity {
  declare static readonly entityName: 'DocumentValidationExecutionRelatedDocument';

  @Uuid()
  tenantId: Uuid;

  @Uuid()
  @References(() => DocumentValidationExecution)
  executionId: Uuid;

  @Uuid()
  @References(() => Document)
  documentId: Uuid;
}
