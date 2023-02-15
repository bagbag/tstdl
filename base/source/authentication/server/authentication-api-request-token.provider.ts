import type { ApiRequestData } from '#/api';
import { ApiRequestTokenProvider } from '#/api/server/api-request-token.provider';
import { singleton } from '#/container';
import { AuthenticationService } from './authentication.service';
import { tryGetAuthorizationTokenStringFromRequest } from './helper';

@singleton()
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
