import { EntityRepository } from '#/database';
import type { MailLog } from './models';

export abstract class MailLogRepository extends EntityRepository<MailLog> { }
