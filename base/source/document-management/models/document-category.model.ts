import { Entity } from '#/orm/entity.js';
import { StringProperty } from '#/schema/index.js';

export class DocumentCategory extends Entity {
  @StringProperty()
  label: string;
}
