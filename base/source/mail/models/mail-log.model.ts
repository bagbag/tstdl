import { Table } from '#/orm/decorators.js';
import { Entity, Json, Timestamp } from '#/orm/index.js';
import { StringProperty } from '#/schema/index.js';
import type { MailData } from './mail-data.model.js';
import type { MailSendResult } from './mail-send-result.model.js';

@Table('log')
export class MailLog extends Entity {
  @Timestamp()
  timestamp: Timestamp;

  @StringProperty({ nullable: true })
  template: string | null;

  @Json()
  data: Json<MailData>;

  @Json({ nullable: true })
  sendResult: Json<MailSendResult> | null;

  @StringProperty({ array: true, nullable: true })
  errors: string[] | null;
}
