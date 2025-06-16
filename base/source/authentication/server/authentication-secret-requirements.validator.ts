import { Singleton } from '#/injector/index.js';
import { PasswordStrength } from '#/password/password-check-result.model.js';
import { checkPassword } from '#/password/password-check.js';
import { isNumber } from '#/utils/type-guards.js';
import { SecretRequirementsError } from '../errors/secret-requirements.error.js';
import type { SecretCheckResult } from '../models/secret-check-result.model.js';

export type SecretTestResult =
  | { success: true, reason?: undefined }
  | { success: false, reason: string };

export abstract class AuthenticationSecretRequirementsValidator {
  abstract checkSecretRequirements(secret: string): Promise<SecretCheckResult>;
  abstract testSecretRequirements(secret: string): Promise<SecretTestResult>;
  abstract validateSecretRequirements(secret: string): Promise<void>;
}

@Singleton({ alias: AuthenticationSecretRequirementsValidator })
export class DefaultAuthenticationSecretRequirementsValidator extends AuthenticationSecretRequirementsValidator {
  async checkSecretRequirements(secret: string): Promise<SecretCheckResult> {
    return await checkPassword(secret, { checkForPwned: true });
  }

  async testSecretRequirements(secret: string): Promise<SecretTestResult> {
    const result = await this.checkSecretRequirements(secret);

    if (isNumber(result.pwned) && (result.pwned > 0)) {
      return { success: false, reason: 'Password is exposed in data breach (https://haveibeenpwned.com/passwords).' };
    }

    if (result.strength < PasswordStrength.Medium) {
      return { success: false, reason: 'Password is too weak.' };
    }

    return { success: true };
  }

  async validateSecretRequirements(secret: string): Promise<void> {
    const result = await this.testSecretRequirements(secret);

    if (!result.success) {
      throw new SecretRequirementsError(result.reason);
    }
  }
}
