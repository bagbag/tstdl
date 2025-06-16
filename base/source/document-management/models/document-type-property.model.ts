import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Unique, Uuid } from '#/orm/types.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentProperty } from './document-property.model.js';
import { DocumentType } from './document-type.model.js';

@DocumentManagementTable({ name: 'type_property' })
@Unique<DocumentTypeProperty>(['tenantId', 'typeId', 'propertyId'])
export class DocumentTypeProperty extends Entity {
  @Uuid({ nullable: true })
  tenantId: string | null;

  @Uuid()
  @References(() => DocumentType)
  typeId: Uuid;

  @Uuid()
  @References(() => DocumentProperty)
  propertyId: Uuid;
}
