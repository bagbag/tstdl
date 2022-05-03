import type { MailAddress } from './mail-address.model';

export type MailSendResult = {
  messageId: string,
  accepted: MailAddress[],
  rejected: MailAddress[],
  pending: MailAddress[]
};
