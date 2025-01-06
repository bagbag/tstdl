import { Entity } from '#/orm/entity.js';
import { Enumeration, StringProperty } from '#/schema/index.js';

export enum DocumentPropertyDataType {
  Text = 0,
  Integer = 1,
  Decimal = 2,
  Boolean = 3
}

export class DocumentProperty extends Entity {
  @StringProperty()
  label: string;

  @Enumeration(DocumentPropertyDataType)
  dataType: DocumentPropertyDataType;
}
