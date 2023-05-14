import { Alphabet } from '#/utils/alphabet.js';

export type DatabaseModuleConfig = {
  idLength?: number,
  idAlphabet?: Alphabet,
  idGenerator?: () => string
};

export const databaseModuleConfig: DatabaseModuleConfig = {
  idLength: 15,
  idAlphabet: Alphabet.LowerUpperCaseNumbers,
  idGenerator: undefined
};

export function configureDatabase(config: DatabaseModuleConfig): void {
  databaseModuleConfig.idLength = config.idLength;
  databaseModuleConfig.idAlphabet = config.idAlphabet;
  databaseModuleConfig.idGenerator = config.idGenerator;
}
