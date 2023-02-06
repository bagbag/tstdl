import type { Entity, NewEntity } from '#/database';
import type { MailData } from './mail-data.model';
import type { MailSendResult } from './mail-send-result.model';

export type MailLog = Entity & {
  timestamp: number,
  template: string | null,
  data: MailData,
  sendResult: MailSendResult | null,
  errors: string[] | null
};

export type NewMailLog = NewEntity<MailLog>;
