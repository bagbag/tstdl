import { getRandomString } from '#/utils/random';
import { databaseModuleConfig } from './module';

export function getNewId(): string {
  return getRandomString(databaseModuleConfig.idLength, databaseModuleConfig.idAlphabet);
}
