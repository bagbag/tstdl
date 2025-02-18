const pattern = /(?=[A-Z])/u;

export function toSnakeCase(value: string): string {
  return value.split(pattern).join('_').toLowerCase();
}
