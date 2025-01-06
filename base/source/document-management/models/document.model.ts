import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { NumericDate, Uuid } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentFile } from './document-file.model.js';
import { DocumentType } from './document-type.model.js';

export class Document extends Entity {
  @Uuid()
  @References(() => DocumentFile)
  fileId: Uuid;

  @Uuid({ nullable: true })
  @References(() => DocumentType)
  typeId: Uuid | null;

  @StringProperty({ nullable: true })
  addition: string | null;

  @NumericDate({ nullable: true })
  date: NumericDate | null;

  @NumericDate({ nullable: true })
  expiration: NumericDate | null;
}
