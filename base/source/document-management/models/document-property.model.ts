import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { Entity } from '#/orm/entity.js';
import { type Enum, Unique } from '#/orm/types.js';
import { Enumeration, StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';

export const DocumentPropertyDataType = defineEnum('DocumentPropertyDataType', {
  Text: 'text',
  Integer: 'integer',
  Decimal: 'decimal',
  Boolean: 'boolean',
  Date: 'date',
});

export type DocumentPropertyDataType = EnumType<typeof DocumentPropertyDataType>;

@DocumentManagementTable()
export class DocumentProperty extends Entity {
  declare static readonly entityName: 'DocumentProperty';

  @StringProperty()
  @Unique()
  label: string;

  @Enumeration(DocumentPropertyDataType)
  dataType: Enum<DocumentPropertyDataType>;
}
