import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Uuid } from '#/orm/types.js';
import { BooleanProperty, Integer, StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentType } from './document-type.model.js';
import { Document } from './document.model.js';

@DocumentManagementTable()
export class DocumentRequest extends Entity implements Pick<Document, 'typeId'> {
  declare static readonly entityName: 'DocumentRequest';

  @Uuid({ nullable: true })
  @References(() => DocumentType)
  typeId: Uuid | null;

  @Integer()
  requiredFilesCount: number;

  @StringProperty({ nullable: true })
  comment: string | null;

  @BooleanProperty()
  completed: boolean;
}
