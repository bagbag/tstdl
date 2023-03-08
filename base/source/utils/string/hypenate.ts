export function hyphenate(value: string): string {
  return value.replace(/[A-Z]|[0-9]+/ug, (match) => `-${match.toLowerCase()}`);
}
