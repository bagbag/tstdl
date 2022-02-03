import { CustomError } from '#/error';
import { isDefined } from '#/utils/type-guards';
import type { ResolveChain } from './types';
import { getChainString } from './utils';

export class ResolveError extends CustomError {
  constructor(message: string, chain: ResolveChain, cause?: Error) {
    const causeMessage = isDefined(cause) ? ` (cause: ${cause.message})` : '';

    super({
      message: `${message}${causeMessage} - chain: ${getChainString(chain)}`,
      cause
    });
  }
}
