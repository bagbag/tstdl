import { CustomError } from '#/error';
import { formatError } from '#/utils/format-error';
import { isDefined, isObject } from '#/utils/type-guards';

export class RpcError extends CustomError {
  static readonly errorName = 'RpcError';

  constructor(message: string, cause?: any) {
    super({ message, cause });
  }
}

export class RpcRemoteError extends CustomError {
  constructor(error: unknown) {
    if ((error instanceof Error) || isObject<Error>(error)) {
      super({ name: error.name, message: error.message, stack: error.stack, cause: isDefined(error.cause) ? new RpcRemoteError(error.cause) : undefined, fast: true });
    }
    else {
      const formatted = formatError(error);
      super({ message: formatted, fast: true });
    }
  }
}
