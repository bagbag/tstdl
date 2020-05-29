import { Alphabet, getRandomString } from '@tstdl/base/utils';

export function getNewDocumentId(): string {
  return getRandomString(15, Alphabet.LowerUpperCaseNumbers);
}
