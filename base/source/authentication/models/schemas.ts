import { databaseSchema } from '#/orm/server/database-schema.js';
import { AuthenticationCredentials } from './authentication-credentials.model.js';
import { AuthenticationSession } from './authentication-session.model.js';

export const authenticationSchema = databaseSchema('authentication');

export const authenticationCredentials = authenticationSchema.getTable(AuthenticationCredentials);
export const authenticationSession = authenticationSchema.getTable(AuthenticationSession);
