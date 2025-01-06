import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Uuid } from '#/orm/types.js';
import { StringProperty } from '#/schema/index.js';
import { DocumentCategory } from './document-category.model.js';

export class DocumentType extends Entity {
  @Uuid()
  @References(() => DocumentCategory)
  categoryId: Uuid;

  @StringProperty({ nullable: true })
  group: string | null;

  @StringProperty()
  label: string;
}
