import type { ApiRequestData } from '#/api/index.js';
import { ApiRequestTokenProvider } from '#/api/server/api-request-token.provider.js';
import { Singleton } from '#/injector/decorators.js';
import { AuthenticationService } from './authentication.service.js';
import { tryGetAuthorizationTokenStringFromRequest } from './helper.js';

@Singleton()
export class AuthenticationApiRequestTokenProvider extends ApiRequestTokenProvider {
  private readonly authenticationService: AuthenticationService;

  constructor(authenticationService: AuthenticationService) {
    super();

    this.authenticationService = authenticationService;
  }

  async getToken<T>(data: ApiRequestData): Promise<T> {
    const tokenString = tryGetAuthorizationTokenStringFromRequest(data.request) ?? '';
    const token = await this.authenticationService.validateToken(tokenString);

    return token as T;
  }
}
