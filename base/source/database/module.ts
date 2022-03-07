import { Alphabet } from '#/utils/alphabet';

export type DatabaseModuleConfig = {
  idLength: number,
  idAlphabet: string
};

export const databaseModuleConfig: DatabaseModuleConfig = {
  idLength: 15,
  idAlphabet: Alphabet.LowerUpperCaseNumbers
};

export function configureDatabase(config: Partial<DatabaseModuleConfig>): void {
  databaseModuleConfig.idLength = config.idLength ?? databaseModuleConfig.idLength;
  databaseModuleConfig.idAlphabet = config.idAlphabet ?? databaseModuleConfig.idAlphabet;
}
