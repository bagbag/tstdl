import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Index, Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentType } from './document-type.model.js';
import { DocumentValidationDefinition } from './document-validation-definition.model.js';

@DocumentManagementTable()
@Unique<DocumentTypeValidation>(['tenantId', 'typeId', 'validationId'])
export class DocumentTypeValidation extends Entity {
  @Uuid({ nullable: true })
  tenantId: string | null;

  @Uuid()
  @References(() => DocumentType)
  @Index()
  typeId: Uuid;

  @Uuid()
  @References(() => DocumentValidationDefinition)
  validationId: Uuid;
}
