import { CustomError } from '#/errors/custom.error.js';
import { isDefined } from '#/utils/type-guards.js';
import type { ResolveChain } from './resolve-chain.js';

export class ResolveError extends CustomError {
  constructor(message: string, chain: ResolveChain, cause?: Error) {
    const causeMessage = isDefined(cause) ? `\n  cause: ${(cause as any)?.message}` : '';

    super({
      message: `${message}${causeMessage}\n  chain: ${chain.format(15)}`,
      cause,
      stack: cause?.stack
    });
  }
}
