import type { MailAddress } from './mail-address.model.js';

export type MailSendResult = {
  messageId: string,
  accepted: MailAddress[],
  rejected: MailAddress[],
  pending: MailAddress[]
};
