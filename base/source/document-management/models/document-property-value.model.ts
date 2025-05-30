import { eq, sql } from 'drizzle-orm';

import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { numNonNulls } from '#/orm/sqls.js';
import { Check, NumericDate, Unique, Uuid } from '#/orm/types.js';
import { BooleanProperty, Integer, NumberProperty, StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentProperty } from './document-property.model.js';
import { Document } from './document.model.js';

@DocumentManagementTable()
@Unique<DocumentPropertyValue>(['documentId', 'propertyId'])
@Check<DocumentPropertyValue>('only_one_value', (table) => eq(numNonNulls(table.text, table.integer, table.decimal, table.boolean, table.date), sql.raw('1')))
export class DocumentPropertyValue extends Entity {
  declare static readonly entityName: 'DocumentPropertyValue';

  @Uuid()
  @References(() => Document)
  documentId: Uuid;

  @Uuid()
  @References(() => DocumentProperty)
  propertyId: Uuid;

  @StringProperty({ nullable: true })
  text: string | null;

  @Integer({ nullable: true })
  integer: number | null;

  @NumberProperty({ nullable: true })
  decimal: number | null;

  @BooleanProperty({ nullable: true })
  boolean: boolean | null;

  @NumericDate({ nullable: true })
  date: NumericDate | null;
}
