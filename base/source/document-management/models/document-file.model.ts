import { Entity } from '#/orm/entity.js';
import { Integer, StringProperty } from '#/schema/index.js';

export class DocumentFile extends Entity {
  @StringProperty({ nullable: true })
  originalFileName: string | null;

  @StringProperty()
  mimeType: string;

  @StringProperty()
  hash: string;

  @Integer()
  size: number;
}
