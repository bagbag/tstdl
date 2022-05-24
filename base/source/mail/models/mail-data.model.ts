import type { OneOrMany } from '#/types';
import type { MailAddress } from './mail-address.model';
import type { MailContent } from './mail-content.model';

export type MailData = {
  content: MailContent,
  from?: MailAddress,
  to?: OneOrMany<MailAddress>,
  subject?: string,
  sender?: MailAddress,
  cc?: OneOrMany<MailAddress>,
  bcc?: OneOrMany<MailAddress>,
  replyTo?: MailAddress,
  inReplyTo?: MailAddress,
  returnPath?: MailAddress,
  references?: OneOrMany<string>,

  /**
   * If a header has an string array as its value, the header is added multiple times.
   */
  headers?: Record<string, string | string[]>
};
