export function noop(): void {
  // noop
}

export function noopPass<T>(value: T): T {
  return value;
}
