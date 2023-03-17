function getRequire(): typeof dynamicRequire {
  return require;
}

export function dynamicRequire<T = any>(id: string): T {
  return getRequire()(id);
}
