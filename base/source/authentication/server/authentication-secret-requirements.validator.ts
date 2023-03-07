import { singleton } from '#/container';
import { checkPassword } from '#/password/password-check';
import { PasswordStrength } from '#/password/password-check-result.model';
import { isNumber } from '#/utils/type-guards';
import { SecretRequirementsError } from '../errors/secret-requirements.error';
import type { SecretCheckResult } from '../models/secret-check-result.model';

export abstract class AuthenticationSecretRequirementsValidator {
  abstract checkSecretRequirements(secret: string): SecretCheckResult | Promise<SecretCheckResult>;
  abstract validateSecretRequirements(secret: string): void | Promise<void>;
}

@singleton({ alias: AuthenticationSecretRequirementsValidator })
export class DefaultAuthenticationSecretRequirementsValidator extends AuthenticationSecretRequirementsValidator {
  async checkSecretRequirements(secret: string): Promise<SecretCheckResult> {
    return checkPassword(secret, { checkForPwned: true });
  }

  async validateSecretRequirements(secret: string): Promise<void> {
    const result = await this.checkSecretRequirements(secret);

    if (isNumber(result.pwned) && (result.pwned > 0)) {
      throw new SecretRequirementsError('Password is exposed in data breach (https://haveibeenpwned.com/passwords).');
    }

    if (result.strength < PasswordStrength.Medium) {
      throw new SecretRequirementsError('Password is too weak.');
    }
  }
}
