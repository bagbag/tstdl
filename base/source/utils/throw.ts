
export function _throw(value: any): never {
  throw value;
}

export function deferThrow(value: any): () => never {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return function deferThrow() {
    throw value;
  };
}
