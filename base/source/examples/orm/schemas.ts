import { databaseSchema } from '#/orm/server/database-schema.js';
import { User } from './user.model.js';

export const mySchema = databaseSchema('my_application');
export const user = mySchema.getTable(User);
