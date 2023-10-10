import { CustomError } from '#/errors/custom.error.js';
import { isDefined } from '#/utils/type-guards.js';

export class SearchIndexError extends CustomError {
  static readonly errorName = 'SearchIndexError';

  readonly type: string;
  readonly raw: unknown;

  constructor(type: string, message: string, { raw, cause }: { raw?: unknown, cause?: Error } = {}) {
    super({ message, cause });

    this.type = type;

    if (isDefined(raw)) {
      this.raw = raw;
    }
  }
}
