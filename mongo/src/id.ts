import { Alphabet, getRandomString } from '@tstdl/base/utils';

let idsLength = 15;
let idsAlphabet: string = Alphabet.LowerUpperCaseNumbers;

export function getNewDocumentId(): string {
  return getRandomString(idsLength, idsAlphabet);
}

export function setIdsLength(length: number): void {
  idsLength = length;
}

export function setIdsAlphabet(alphabet: string): void {
  idsAlphabet = alphabet;
}
