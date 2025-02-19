import { databaseSchema } from '#/orm/server/database-schema.js';
import { MailLog } from './mail-log.model.js';

export const mailSchema = databaseSchema('mail');

export const mailLog = mailSchema.getTable(MailLog);
