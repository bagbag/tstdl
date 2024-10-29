const pattern = /(?=[A-Z])/u; // eslint-disable-line prefer-named-capture-group

export function toSnakeCase(value: string): string {
  return value.split(pattern).join('_').toLowerCase();
}
