import { databaseSchema } from '#/orm/server/database-schema.js';
import { PostgresJob } from './job.model.js';

export const queueSchema = databaseSchema('queue');

export const job = queueSchema.getTable(PostgresJob);
