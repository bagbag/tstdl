import { CustomError } from '#/error';
import type { ResolveChain } from './types';
import { getChainString } from './utils';

export class ResolveError extends CustomError {
  constructor(message: string, chain: ResolveChain, cause?: Error) {
    super({
      message: `${message} - chain: ${getChainString(chain)}`,
      cause
    });
  }
}
