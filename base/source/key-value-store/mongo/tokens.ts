import type { MongoRepositoryConfig } from '#/database/mongo/types.js';
import { injectionToken } from '#/injector/token.js';
import type { MongoKeyValue } from './mongo-key-value.model.js';

export const DEFAULT_KEY_VALUE_REPOSITORY_CONFIG = injectionToken<MongoRepositoryConfig<MongoKeyValue>>('default key value repository config');
