import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentType } from './document-type.model.js';
import { DocumentValidationDefinition } from './document-validation-definition.model.js';

@DocumentManagementTable()
@Unique<DocumentTypeValidation>(['typeId', 'validationId'])
export class DocumentTypeValidation extends Entity {
  @Uuid()
  @References(() => DocumentType)
  typeId: Uuid;

  @Uuid()
  @References(() => DocumentValidationDefinition)
  validationId: Uuid;
}
