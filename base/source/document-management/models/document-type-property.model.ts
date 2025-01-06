import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Uuid } from '#/orm/types.js';
import { DocumentProperty } from './document-property.model.js';
import { DocumentType } from './document-type.model.js';

export class DocumentTypeProperty extends Entity {
  @Uuid()
  @References(() => DocumentType)
  typeId: Uuid;

  @Uuid()
  @References(() => DocumentProperty)
  propertyId: Uuid;
}
