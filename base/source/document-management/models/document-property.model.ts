import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { Entity } from '#/orm/entity.js';
import { type Enum, Unique, Uuid } from '#/orm/types.js';
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

@DocumentManagementTable({ name: 'property' })
@Unique<DocumentProperty>(['tenantId', 'label'])
export class DocumentProperty extends Entity {
  declare static readonly entityName: 'DocumentProperty';

  @Uuid({ nullable: true })
  tenantId: string | null;

  @StringProperty()
  @Unique()
  label: string;

  @Enumeration(DocumentPropertyDataType)
  dataType: Enum<DocumentPropertyDataType>;
}
