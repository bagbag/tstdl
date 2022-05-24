import type { Entity, NewEntity } from '#/database';
import type { MailData } from './mail-data.model';
import type { MailSendResult } from './mail-send-result.model';

export type MailLog = Entity & {
  timestamp: number,
  templateKey?: string,
  data: MailData,
  sendResult?: MailSendResult,
  errors?: string[]
};

export type NewMailLog = NewEntity<MailLog>;
