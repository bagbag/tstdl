export function _throw(value: any): never {
  throw value;
}

export function deferThrow(valueProvider: () => any): () => never {
  return function deferThrow() {
    throw valueProvider();
  };
}
