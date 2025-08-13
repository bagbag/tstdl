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
  /**
   * Checks the secret against the requirements.
   * @param secret The secret to check.
   * @returns The result of the check.
   */
  abstract checkSecretRequirements(secret: string): Promise<SecretCheckResult>;

  /**
   * Tests the secret against the requirements.
   * @param secret The secret to test.
   * @returns The result of the test.
   */
  abstract testSecretRequirements(secret: string): Promise<SecretTestResult>;

  /**
   * Validates the secret against the requirements. Throws an error if the requirements are not met.
   * @param secret The secret to validate.
   * @throws {SecretRequirementsError} If the secret does not meet the requirements.
   */
  abstract validateSecretRequirements(secret: string): Promise<void>;
}

/**
 * Default validator for secret requirements.
 *
 * Checks for pwned passwords and password strength.
 * - Pwned passwords are not allowed.
 * - Password strength must be at least 'medium'.
 */
@Singleton({ alias: AuthenticationSecretRequirementsValidator })
export class DefaultAuthenticationSecretRequirementsValidator extends AuthenticationSecretRequirementsValidator {
  /**
   * Checks the secret against the requirements.
   * @param secret The secret to check.
   * @returns The result of the check.
   */
  async checkSecretRequirements(secret: string): Promise<SecretCheckResult> {
    return await checkPassword(secret, { checkForPwned: true });
  }

  /**
   * Tests the secret against the requirements.
   * @param secret The secret to test.
   * @returns The result of the test.
   */
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

  /**
   * Validates the secret against the requirements. Throws an error if the requirements are not met.
   * @param secret The secret to validate.
   * @throws {SecretRequirementsError} If the secret does not meet the requirements.
   */
  async validateSecretRequirements(secret: string): Promise<void> {
    const result = await this.testSecretRequirements(secret);

    if (!result.success) {
      throw new SecretRequirementsError(result.reason);
    }
  }
}
