import { apiController } from '#/api/server';
import type { ApiController, ApiRequestData, ApiServerResult } from '#/api/types';
import { UnauthorizedError } from '#/error/unauthorized.error';
import { HttpServerResponse } from '#/http/server';
import { currentTimestamp } from '#/utils/date-time';
import type { AuthenticationApiDefinition } from '../authentication.api';
import { authenticationApiDefinition } from '../authentication.api';
import type { TokenPayloadBase } from '../models';
import type { TokenResult } from './authentication.service';
import { AuthenticationService } from './authentication.service';
import { tryGetAuthorizationTokenStringFromRequest } from './helper';

@apiController(authenticationApiDefinition)
export class AuthenticationApiController<TokenPayload extends TokenPayloadBase, AuthenticationData> implements ApiController<AuthenticationApiDefinition<TokenPayload, AuthenticationData>> {
  readonly authenticationService: AuthenticationService<TokenPayload, AuthenticationData>;

  constructor(authenticationService: AuthenticationService<TokenPayload, AuthenticationData>) {
    this.authenticationService = authenticationService;
  }

  async token({ parameters }: ApiRequestData<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'token'>): Promise<ApiServerResult<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'token'>> {
    const authenticationResult = await this.authenticationService.authenticate(parameters.subject, parameters.secret);

    if (!authenticationResult.success) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    const result = await this.authenticationService.getToken(authenticationResult.subject, parameters.data);

    return this.getAuthenticationResponse(result);
  }

  async refresh({ request, parameters }: ApiRequestData<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'refresh'>): Promise<ApiServerResult<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'refresh'>> {
    const tokenString = tryGetAuthorizationTokenStringFromRequest(request, 'refreshToken') ?? '';
    const result = await this.authenticationService.refresh(tokenString, parameters.data);

    return this.getAuthenticationResponse(result);
  }

  async endSession({ request }: ApiRequestData<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'endSession'>): Promise<ApiServerResult<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'endSession'>> {
    const tokenString = tryGetAuthorizationTokenStringFromRequest(request) ?? '';
    const token = await this.authenticationService.validateToken(tokenString);
    await this.authenticationService.endSession(token.payload.sessionId);

    return 'ok';
  }

  timestamp(): ApiServerResult<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'timestamp'> {
    return currentTimestamp();
  }

  private getAuthenticationResponse({ token, jsonToken, refreshToken }: TokenResult<TokenPayload>): HttpServerResponse {
    const result: ApiServerResult<AuthenticationApiDefinition<TokenPayload, AuthenticationData>, 'token'> = jsonToken.payload;

    return new HttpServerResponse({
      cookies: {
        authorization: { value: `Bearer ${token}`, httpOnly: true, secure: true, sameSite: 'strict', expires: jsonToken.payload.refreshTokenExp * 1000 },
        refreshToken: { value: `Bearer ${refreshToken}`, httpOnly: true, secure: true, sameSite: 'strict', expires: jsonToken.payload.refreshTokenExp * 1000 }
      },
      body: {
        json: result
      }
    });
  }
}
