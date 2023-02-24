import { EntityRepository } from '#/database/index.js';
import type { MailLog } from './models/mail-log.model.js';

export abstract class MailLogRepository extends EntityRepository<MailLog> { }
