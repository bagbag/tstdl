import { getRandomString } from '#/utils/random.js';
import { databaseModuleConfig } from './module.js';

export function getNewId(): string {
  return getRandomString(databaseModuleConfig.idLength, databaseModuleConfig.idAlphabet);
}
