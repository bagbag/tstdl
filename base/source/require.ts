const _require = globalThis.require as typeof dynamicRequire;

export function dynamicRequire<T = any>(id: string): T {
  return _require(id);
}
