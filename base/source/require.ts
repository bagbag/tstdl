export function dynamicRequire<T = any>(id: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  return require(id) as T;
}
