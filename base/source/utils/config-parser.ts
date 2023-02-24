import { isUndefined } from './type-guards.js';

export const configValidators = {
  integer: /^-?\d+$/u,
  positiveInteger: /^[1-9]\d*$/u,
  boolean: /true|false|yes|no|0|1/ui
};

export function boolean<T>(variable: string, defaultValue: T): boolean | T {
  return string(variable, defaultValue, configValidators.boolean, (value) => ['true', 'yes', '1'].includes(value.toLowerCase()));
}

export function integer<T>(variable: string, defaultValue: T): number | T {
  return string(variable, defaultValue, configValidators.integer, (value) => parseInt(value, 10));
}

export function positiveInteger<T>(variable: string, defaultValue: T): number | T {
  return string(variable, defaultValue, configValidators.positiveInteger, (value) => parseInt(value, 10));
}

export function string<T>(variable: string, defaultValue: T, validator?: RegExp): string | T;
export function string<T, U>(variable: string, defaultValue: T, validator: RegExp, transformer: (value: string) => U): T | U;
export function string<T, U>(variable: string, defaultValue: T, validator?: RegExp, transformer: (value: string) => U = (value) => value as any as U): string | T | U {
  const environmentValue = process.env[variable];

  if (isUndefined(environmentValue)) {
    return defaultValue;
  }

  const valid = isUndefined(validator) ? true : validator.test(environmentValue);

  if (!valid) {
    throw new Error(`invalid value for ${variable}`);
  }

  return transformer(environmentValue);
}
