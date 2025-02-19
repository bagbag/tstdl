import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { Entity } from '#/orm/entity.js';
import { Enumeration, StringProperty } from '#/schema/index.js';

export const DocumentPropertyDataType = defineEnum('DocumentPropertyDataType', {
  Text: 'text',
  Integer: 'integer',
  Decimal: 'decimal',
  Boolean: 'boolean'
});

export type DocumentPropertyDataType = EnumType<typeof DocumentPropertyDataType>;

export class DocumentProperty extends Entity {
  @StringProperty()
  label: string;

  @Enumeration(DocumentPropertyDataType)
  dataType: DocumentPropertyDataType;
}
