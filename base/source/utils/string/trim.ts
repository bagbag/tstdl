export function trim(value: string, valueToRemove: string): string {
  let result = value;

  while (result.startsWith(valueToRemove)) {
    result = result.slice(valueToRemove.length);
  }

  while (result.endsWith(valueToRemove)) {
    result = result.slice(0, -valueToRemove.length);
  }

  return result;
}
