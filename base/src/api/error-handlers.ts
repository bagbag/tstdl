import { NotFoundError, UnauthorizedError } from '../error';
import { ValidationError } from '../error/validation';
import { registerErrorHandler } from './response';

export function registerDefaultErrorHandlers(): void {
  registerErrorHandler(ValidationError, 400, ({ name, message, details }) => ({ name, message, details }), ({ name, message, details }) => new ValidationError(name, message, details));
  registerErrorHandler(NotFoundError, 404, () => undefined, (_, error) => new NotFoundError(error.message));
  registerErrorHandler(UnauthorizedError, 401, () => undefined, (_, error) => new UnauthorizedError(error.message));
}
