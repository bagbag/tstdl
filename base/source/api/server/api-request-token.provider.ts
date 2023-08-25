import { Singleton } from '#/injector/decorators.js';
import type { ApiRequestData } from '../types.js';

export abstract class ApiRequestTokenProvider {
  abstract getToken<T>(requestData: ApiRequestData): T | Promise<T>;
}

@Singleton({ alias: ApiRequestTokenProvider })
export class NoopApiRequestTokenProvider extends ApiRequestTokenProvider {
  getToken<T>(): T {
    throw new Error('No RequestTokenProvider registered');
  }
}
