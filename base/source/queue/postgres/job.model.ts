import { Index, Table } from '#/orm/decorators.js';
import { EntityWithoutMetadata } from '#/orm/entity.js';
import { Integer, Json, Timestamp } from '#/orm/index.js';
import { StringProperty } from '#/schema/index.js';
import type { ObjectLiteral } from '#/types/index.js';
import type { Job } from '../queue.js';

@Table('job')
@Index<PostgresJob>(['queue', 'tag'])
export class PostgresJob<T extends ObjectLiteral = ObjectLiteral> extends EntityWithoutMetadata implements Job<T> {
  @StringProperty()
  queue: string;

  @StringProperty({ nullable: true })
  tag: string | null;

  @Integer()
  priority: Integer;

  @Timestamp()
  enqueueTimestamp: Timestamp;

  @Integer()
  tries: Integer;

  @Timestamp({ nullable: true })
  lastDequeueTimestamp: Timestamp | null;

  @Json()
  data: Json<T>;
}
