import { NotFoundError, UnauthorizedError } from '../error';
import { ValidationError } from '../error/validation';
import { registerErrorHandler } from './response';

export function registerDefaultErrorHandlers(): void {
  registerErrorHandler(ValidationError, 400, ({ message, details }) => ({ name, message, details }), ({ message, details }) => new ValidationError(message, details));
  registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
  registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
}
