import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { Entity, Index, References, Unique, Uuid } from '#/orm/index.js';
import { Enumeration, StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentType } from './document-type.model.js';
import { Document } from './document.model.js';

export const DocumentRequestState = defineEnum('DocumentRequestState', {
  /** No document or pending document */
  Open: 'open',
  /** Request finished with approved document */
  Fulfilled: 'fulfilled',
  /** Request canceled without document or with rejected document */
  Closed: 'closed',
});

export type DocumentRequestState = EnumType<typeof DocumentRequestState>;

@DocumentManagementTable()
export class DocumentRequest extends Entity {
  declare static readonly entityName: 'DocumentRequest';

  @Uuid({ nullable: true })
  @References(() => DocumentType)
  typeId: Uuid | null;

  @Uuid({ nullable: true })
  @References(() => Document)
  @Unique()
  documentId: Uuid | null;

  @StringProperty({ nullable: true })
  comment: string | null;

  @Enumeration(DocumentRequestState)
  @Index()
  state: DocumentRequestState;
}
