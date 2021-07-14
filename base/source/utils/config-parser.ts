export const configValidators = {
  integer: /^-?\d+$/u,
  positiveInteger: /^[1-9]\d*$/u,
  boolean: /true|false|yes|no|0|1/ui
};

export function boolean(variable: string, defaultValue: boolean): boolean {
  const stringValue = string(variable, defaultValue ? 'true' : 'false', configValidators.boolean);
  const lowerCased = stringValue.toLowerCase();
  const value = ['true', 'yes', '1'].includes(lowerCased);

  return value;
}

export function integer(variable: string, defaultValue: number): number {
  const stringValue = string(variable, defaultValue.toString(), configValidators.integer);
  const value = parseInt(stringValue, 10);

  return value;
}

export function positiveInteger(variable: string, defaultValue: number): number {
  const stringValue = string(variable, defaultValue.toString(), configValidators.positiveInteger);
  const value = parseInt(stringValue, 10);

  return value;
}

export function string(variable: string, defaultValue: string, validator?: RegExp): string {
  // eslint-disable-next-line no-process-env
  const environmentValue = process.env[variable];
  const value = environmentValue != undefined ? environmentValue : defaultValue;
  const valid = validator == undefined ? true : validator.test(value);

  if (!valid) {
    throw new Error(`invalid value for ${variable}`);
  }

  return value;
}
