type ErrorData = Pick<Error, 'name' | 'message' | 'stack'>;

export function serializeError(error: Error): ErrorData {
  return { name: error.name, message: error.message, stack: error.stack };
}

export function deserializeError(data: ErrorData): Error {
  const error = new Error(data.message);
  error.name = data.name;
  error.stack = data.stack;

  return error;
}
