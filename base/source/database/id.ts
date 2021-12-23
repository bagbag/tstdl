import { Alphabet } from '#/utils/alphabet';
import { getRandomString } from '#/utils/random';

let idLength = 15;
let idAlphabet: string = Alphabet.LowerUpperCaseNumbers;

export function getNewId(): string {
  return getRandomString(idLength, idAlphabet);
}

export function setIdLength(length: number): void {
  idLength = length;
}

export function setIdAlphabet(alphabet: string): void {
  idAlphabet = alphabet;
}
