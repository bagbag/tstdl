import { CustomError } from '#/error/custom.error';
import { isDefined } from '#/utils/type-guards';
import type { ResolveChain } from './types';
import { getChainString } from './utils';

export class ResolveError extends CustomError {
  constructor(message: string, chain: ResolveChain, cause?: Error) {
    const causeMessage = isDefined(cause) ? `\n  cause: ${cause.message}` : '';

    super({
      message: `${message}${causeMessage}\n  chain: ${getChainString(chain)}`,
      cause
    });
  }
}
