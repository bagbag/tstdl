import { Property } from '#/schema/decorators/property.js';
import { Array } from '#/schema/schemas/array.js';
import { Enumeration } from '#/schema/schemas/enumeration.js';

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
  @Property({ optional: true })
  pwned?: number;

  @Array(String)
  warnings: string[];

  @Array(String)
  suggestions: string[];
}
