import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentValidationExecution } from './document-validation-execution.model.js';
import { Document } from './document.model.js';

@DocumentManagementTable()
@Unique<DocumentValidationExecutionRelatedDocument>(['executionId', 'documentId'], { naming: 'abbreviated-table' })
export class DocumentValidationExecutionRelatedDocument extends Entity {
  declare static readonly entityName: 'DocumentValidationExecutionRelatedDocument';

  @Uuid()
  @References(() => DocumentValidationExecution)
  executionId: Uuid;

  @Uuid()
  @References(() => Document)
  documentId: Uuid;
}
