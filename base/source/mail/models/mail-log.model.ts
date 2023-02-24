import type { Entity, NewEntity } from '#/database/index.js';
import type { MailData } from './mail-data.model.js';
import type { MailSendResult } from './mail-send-result.model.js';

export type MailLog = Entity & {
  timestamp: number,
  template: string | null,
  data: MailData,
  sendResult: MailSendResult | null,
  errors: string[] | null
};

export type NewMailLog = NewEntity<MailLog>;
