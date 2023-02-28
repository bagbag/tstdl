import { Array, Enumeration, Property } from '#/schema';
import { propertyName } from '#/utils/object';
import { timeout } from '#/utils/timing';
import { isDefined, isUndefined } from '#/utils/type-guards';
import type { zxcvbnAsync } from '@zxcvbn-ts/core';
import type { OptionsType } from '@zxcvbn-ts/core/dist/types';
import { haveIBeenPwned } from './have-i-been-pwned';
import type { PasswordCheckLocalization } from './password-check.localization';
import { passwordCheckLocalizationKeys } from './password-check.localization';

export type CheckPasswordOptions = {
  checkForPwned?: boolean
};

export enum PasswordStrength {
  VeryWeak = 0,
  Weak = 1,
  Medium = 2,
  Strong = 3,
  VeryStrong = 4
}

export class PasswordCheckResult {
  @Enumeration(PasswordStrength)
  strength: PasswordStrength;

  /**
   * Count of how many times it appears in the data set from https://haveibeenpwned.com/
   * Undefined if disabled in options or error occured (either timeout or api error)
   */
  @Property(Number, { optional: true })
  pwned?: number;

  @Array(String)
  warnings: string[];

  @Array(String)
  suggestions: string[];
}

export async function checkPassword(password: string, { checkForPwned = true }: CheckPasswordOptions = {}): Promise<PasswordCheckResult> {
  const zxcvbn = await getZxcvbn();

  const [zxcvbnResult, pwnedResult] = await Promise.all([
    zxcvbn(password),
    checkForPwned ? Promise.race([haveIBeenPwned(password).catch(() => undefined), timeout(1000).then(() => undefined)]) : undefined
  ]);

  const pawned = (isDefined(pwnedResult) && (pwnedResult > 0)) ? [passwordCheckLocalizationKeys.tstdl.passwordCheck.warnings.pwned[propertyName]] : [];
  const warnings = zxcvbnResult.feedback.warning
    ? [...pawned, passwordCheckLocalizationKeys.tstdl.passwordCheck.warnings[zxcvbnResult.feedback.warning as (keyof PasswordCheckLocalization['keys']['tstdl']['passwordCheck']['warnings'])][propertyName]]
    : pawned;

  const suggestions = (zxcvbnResult.feedback.suggestions as (keyof PasswordCheckLocalization['keys']['tstdl']['passwordCheck']['suggestions'])[])
    .map((suggestion): string => passwordCheckLocalizationKeys.tstdl.passwordCheck.suggestions[suggestion][propertyName]);

  return {
    strength: zxcvbnResult.score,
    pwned: pwnedResult,
    warnings,
    suggestions
  };
}

let zxcvbnAsyncInstance: Promise<typeof zxcvbnAsync> | typeof zxcvbnAsync | undefined;

async function getZxcvbn(): Promise<typeof zxcvbnAsync> {
  if (isUndefined(zxcvbnAsyncInstance)) {
    zxcvbnAsyncInstance = importZxcvbn();
  }

  return zxcvbnAsyncInstance;
}

async function importZxcvbn(): Promise<typeof zxcvbnAsync> {
  const [{ zxcvbnAsync, zxcvbnOptions }, common, english, german] = await Promise.all([
    import('@zxcvbn-ts/core'),
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
    import('@zxcvbn-ts/language-common').then((module) => module.default ?? module as unknown as typeof module.default),
    import('@zxcvbn-ts/language-en').then((module) => module.default ?? module as unknown as typeof module.default),
    import('@zxcvbn-ts/language-de').then((module) => module.default ?? module as unknown as typeof module.default)
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
  ]);

  const options: OptionsType = {
    graphs: common.adjacencyGraphs,
    useLevenshteinDistance: true,
    dictionary: {
      ...common.dictionary,
      ...english.dictionary,
      ...german.dictionary
    }
  };

  zxcvbnOptions.setOptions(options);

  return zxcvbnAsync;
}
