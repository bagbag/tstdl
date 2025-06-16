import { Table } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Json, Unique } from '#/orm/types.js';
import { any, StringProperty } from '#/schema/index.js';

@Table('key_value')
@Unique<KeyValue>(['module', 'key'])
export class KeyValue extends Entity {
  @StringProperty()
  module: string;

  @StringProperty()
  key: string;

  @Json({ schema: any() })
  value: Json<unknown>;
}
