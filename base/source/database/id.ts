import { Alphabet } from '#/utils/alphabet.js';
import { getRandomString } from '#/utils/random.js';
import { isDefined } from '#/utils/type-guards.js';
import { databaseModuleConfig } from './module.js';

export function getNewId(): string {
  return isDefined(databaseModuleConfig.idGenerator)
    ? databaseModuleConfig.idGenerator()
    : getRandomString(databaseModuleConfig.idLength ?? 15, databaseModuleConfig.idAlphabet ?? Alphabet.LowerUpperCaseNumbers);
}
