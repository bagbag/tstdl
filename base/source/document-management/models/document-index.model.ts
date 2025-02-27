import { References } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Array, Uuid } from '#/orm/types.js';
import { string, StringProperty } from '#/schema/index.js';
import { Document } from './document.model.js';

export class DocumentIndex extends Entity {
  @Uuid()
  @References(() => Document)
  documentId: Uuid;

  @StringProperty()
  summary: string;

  @Array(string())
  tags: string[];
}
