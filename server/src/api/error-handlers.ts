import { registerErrorHandler } from '@tstdl/base/api';
import { NotFoundError, UnauthorizedError } from '@tstdl/base/error';
import { ValidationError } from './validation';

export function registerDefaultErrorHandlers(): void {
  registerErrorHandler(ValidationError, 400, ({ name, message, details }) => ({ name, message, details }), ({ name, message, details }) => new ValidationError(name, message, details));
  registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
  registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
}
