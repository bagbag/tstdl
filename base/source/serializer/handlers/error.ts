import { registerSerializationType } from '../serializer';

export function registerErrorType(): void {
  registerSerializationType(Error, ({ name, message, stack }) => ({ name, message, stack }), deserializeError);
}

function deserializeError({ name, message, stack }: Pick<Error, 'name' | 'message' | 'stack'>): Error {
  const error = new Error(message);
  error.name = name;
  error.stack = stack;

  return error;
}
