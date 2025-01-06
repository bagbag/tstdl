import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Uuid } from '#/orm/types.js';
import { BooleanProperty, Integer, NumberProperty, SchemaOutput, StringProperty, union } from '#/schema/index.js';
import { DocumentProperty } from './document-property.model.js';
import { Document } from './document.model.js';

export abstract class DocumentPropertyValueBase extends Entity {
  @Uuid()
  @References(() => Document)
  documentId: Uuid;

  @Uuid()
  @References(() => DocumentProperty)
  propertyId: Uuid;
}

export class DocumentPropertyTextValue extends DocumentPropertyValueBase {
  @StringProperty({ nullable: true })
  value: string | null;
}

export class DocumentPropertyIntegerValue extends DocumentPropertyValueBase {
  @Integer({ nullable: true })
  value: number | null;
}

export class DocumentPropertyDecimalValue extends DocumentPropertyValueBase {
  @NumberProperty({ nullable: true })
  value: number | null;
}

export class DocumentPropertyBooleanValue extends DocumentPropertyValueBase {
  @BooleanProperty({ nullable: true })
  value: boolean | null;
}

export const documentPropertyValueSchema = union(DocumentPropertyTextValue, DocumentPropertyIntegerValue, DocumentPropertyDecimalValue, DocumentPropertyBooleanValue);

export type DocumentPropertyValue = SchemaOutput<typeof documentPropertyValueSchema>;
