import { Entity } from '#/orm/entity.js';
import { StringProperty } from '#/schema/index.js';

export class DocumentRequestsTemplate extends Entity {
  @StringProperty()
  label: string;

  @StringProperty({ nullable: true })
  description: string | null;
}
