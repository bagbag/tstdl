import { digest } from '#/utils/cryptography';

const urlBase = 'https://api.pwnedpasswords.com';

/**
 * Checks password against https://haveibeenpwned.com/passwords
 * @param password password to check
 * @returns how often the password was pwned
 */
export async function haveIBeenPwned(password: string): Promise<number> {
  const hash = (await digest('SHA-1', password).toHex()).toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`${urlBase}/range/${prefix}`);
  const result = await response.text();

  const lineStart = result.indexOf(suffix);

  if (lineStart == -1) {
    return 0;
  }

  const lineEnd = result.indexOf('\r\n', lineStart);
  const line = result.slice(lineStart, lineEnd);
  const pwnedCount = parseInt(line.split(':')[1]!, 10);

  return pwnedCount;
}
