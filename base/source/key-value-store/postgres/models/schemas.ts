import { databaseSchema } from '#/orm/server/database-schema.js';
import { KeyValue } from './key-value.model.js';

export const keyValueSchema = databaseSchema('key_value_store');

export const keyValue = keyValueSchema.getTable(KeyValue);
