import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { NumericDate, Unique, Uuid } from '#/orm/types.js';
import { Enumeration, Integer, StringProperty } from '#/schema/index.js';
import { DocumentManagementTable } from './document-management-table.js';
import { DocumentType } from './document-type.model.js';

export const DocumentApproval = defineEnum('DocumentApproval', {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
});

export type DocumentApproval = EnumType<typeof DocumentApproval>;

export type UpdatableDocumentProperties = keyof Pick<Document, 'typeId' | 'title' | 'subtitle' | 'date' | 'summary' | 'comment'>;

@DocumentManagementTable()
@Unique<Document>(['tenantId', 'id'])
export class Document extends Entity {
  declare static readonly entityName: 'Document';

  @Uuid()
  tenantId: Uuid;

  @Uuid({ nullable: true })
  @References(() => DocumentType)
  typeId: Uuid | null;

  @StringProperty({ nullable: true })
  title: string | null;

  @StringProperty({ nullable: true })
  subtitle: string | null;

  @Integer({ nullable: true, coerce: true })
  pages: number | null;

  @NumericDate({ nullable: true, coerce: true })
  date: NumericDate | null;

  @StringProperty({ nullable: true })
  summary: string | null;

  @Enumeration(DocumentApproval)
  approval: DocumentApproval;

  @StringProperty({ nullable: true })
  comment: string | null;

  @StringProperty({ nullable: true })
  originalFileName: string | null;

  @StringProperty()
  mimeType: string;

  @StringProperty()
  hash: string;

  @Integer()
  size: number;

  @Uuid({ nullable: true })
  createUserId: Uuid | null;
}
