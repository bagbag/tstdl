import { singleton } from '#/container/index.js';
import type { ApiRequestData } from '../types.js';

export abstract class ApiRequestTokenProvider {
  abstract getToken<T>(requestData: ApiRequestData): T | Promise<T>;
}

@singleton({ alias: ApiRequestTokenProvider })
export class NoopApiRequestTokenProvider extends ApiRequestTokenProvider {
  getToken<T>(): T {
    throw new Error('No RequestTokenProvider registered');
  }
}
