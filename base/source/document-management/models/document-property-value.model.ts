import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Check, NumericDate, Unique, Uuid } from '#/orm/types.js';
import { BooleanProperty, Integer, NumberProperty, StringProperty } from '#/schema/index.js';
import { sql } from 'drizzle-orm';
import { DocumentProperty } from './document-property.model.js';
import { DocumentRequestAssignmentTask } from './document-request-assignment-task.model.js';
import { DocumentRequestFile } from './document-request-file.model.js';
import { Document } from './document.model.js';

@Check<DocumentPropertyValueBase>('only_one_value', (table) => sql`num_nonnulls(${table.text}, ${table.integer}, ${table.decimal}, ${table.boolean}, ${table.date}) = 1`)
export abstract class DocumentPropertyValueBase extends Entity {
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

@Unique<DocumentPropertyValue>(['documentId', 'propertyId'])
export class DocumentPropertyValue extends DocumentPropertyValueBase {
  @Uuid()
  @References(() => Document)
  documentId: Uuid;
}

@Unique<DocumentRequestFilePropertyValue>(['requestFileId', 'propertyId'], { naming: 'abbreviated-table' })
export class DocumentRequestFilePropertyValue extends DocumentPropertyValueBase {
  @Uuid()
  @References(() => DocumentRequestFile)
  requestFileId: Uuid;
}

@Unique<DocumentRequestAssignmentTaskPropertyValue>(['requestAssignmentTaskId', 'propertyId'], { naming: 'abbreviated-table' })
export class DocumentRequestAssignmentTaskPropertyValue extends DocumentPropertyValueBase {
  declare static readonly entityName: 'DocumentRequestAssignmentTaskPropertyValue';

  @Uuid()
  @References(() => DocumentRequestAssignmentTask)
  requestAssignmentTaskId: Uuid;
}
