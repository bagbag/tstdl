import { CustomError } from '#/error';
import { isDefined } from '#/utils';

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
