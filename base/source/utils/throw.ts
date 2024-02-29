export function _throw(value: any): never { // eslint-disable-line no-underscore-dangle
  throw value;
}

export function deferThrow(valueProvider: () => any): () => never {
  return function deferThrow() { // eslint-disable-line @typescript-eslint/no-shadow
    throw valueProvider();
  };
}
