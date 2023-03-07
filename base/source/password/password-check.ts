import { propertyName } from '#/utils/object';
import { timeout } from '#/utils/timing';
import { isNotNullOrUndefined, isUndefined } from '#/utils/type-guards';
import type { zxcvbnAsync } from '@zxcvbn-ts/core';
import type { OptionsType } from '@zxcvbn-ts/core/dist/types';
import { haveIBeenPwned } from './have-i-been-pwned';
import type { PasswordCheckLocalization } from './password-check.localization';
import { passwordCheckLocalizationKeys } from './password-check.localization';
import type { PasswordCheckResult } from './password-check-result.model';

export type CheckPasswordOptions = {
  checkForPwned?: boolean
};

export async function checkPassword(password: string, { checkForPwned = true }: CheckPasswordOptions = {}): Promise<PasswordCheckResult> {
  const zxcvbn = await getZxcvbn();

  const [zxcvbnResult, pwnedResult] = await Promise.all([
    zxcvbn(password),
    checkForPwned ? Promise.race([haveIBeenPwned(password).catch(() => undefined), timeout(1000).then(() => undefined)]) : undefined
  ]);

  const pwnedWarnings = (isNotNullOrUndefined(pwnedResult) && (pwnedResult > 0)) ? [passwordCheckLocalizationKeys.tstdl.passwordCheck.warnings.pwned[propertyName]] : [];
  const warnings = zxcvbnResult.feedback.warning
    ? [...pwnedWarnings, passwordCheckLocalizationKeys.tstdl.passwordCheck.warnings[zxcvbnResult.feedback.warning as (keyof PasswordCheckLocalization['keys']['tstdl']['passwordCheck']['warnings'])][propertyName]]
    : pwnedWarnings;

  const suggestions = (zxcvbnResult.feedback.suggestions as (keyof PasswordCheckLocalization['keys']['tstdl']['passwordCheck']['suggestions'])[])
    .map((suggestion): string => passwordCheckLocalizationKeys.tstdl.passwordCheck.suggestions[suggestion][propertyName]);

  return {
    strength: ((pwnedResult ?? 0) > 0) ? 0 : zxcvbnResult.score,
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
