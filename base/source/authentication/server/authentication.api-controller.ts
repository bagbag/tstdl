import { apiController } from '#/api/server';
import type { ApiController, ApiRequestData, ApiServerResult } from '#/api/types';
import { UnauthorizedError } from '#/error/unauthorized.error';
import { HttpServerResponse } from '#/http/server';
import { currentTimestamp } from '#/utils/date-time';
import type { AuthenticationApiDefinition } from '../authentication.api';
import { authenticationApiDefinition } from '../authentication.api';
import type { TokenResult } from './authentication.service';
import { AuthenticationService } from './authentication.service';
import { tryGetAuthorizationTokenStringFromRequest } from './helper';

@apiController(authenticationApiDefinition)
export class AuthenticationApiController<AdditionalTokenPayload, AuthenticationData> implements ApiController<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>> {
  readonly authenticationService: AuthenticationService<AdditionalTokenPayload, AuthenticationData>;

  constructor(authenticationService: AuthenticationService<AdditionalTokenPayload, AuthenticationData>) {
    this.authenticationService = authenticationService;
  }

  async token({ parameters }: ApiRequestData<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'token'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'token'>> {
    const authenticationResult = await this.authenticationService.authenticate(parameters.subject, parameters.secret);

    if (!authenticationResult.success) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    const result = await this.authenticationService.getToken(authenticationResult.subject, parameters.data);

    return this.getTokenResponse(result);
  }

  async refresh({ request, parameters }: ApiRequestData<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'refresh'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'refresh'>> {
    const tokenString = tryGetAuthorizationTokenStringFromRequest(request, 'refreshToken') ?? '';
    const result = await this.authenticationService.refresh(tokenString, parameters.data);

    return this.getTokenResponse(result);
  }

  async endSession({ request }: ApiRequestData<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'endSession'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'endSession'>> {
    const tokenString = tryGetAuthorizationTokenStringFromRequest(request) ?? '';
    const token = await this.authenticationService.validateToken(tokenString);
    await this.authenticationService.endSession(token.payload.sessionId);

    return 'ok';
  }

  timestamp(): ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'timestamp'> {
    return currentTimestamp();
  }

  private getTokenResponse({ token, jsonToken, refreshToken }: TokenResult<AdditionalTokenPayload>): HttpServerResponse {
    const result: ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'token'> = jsonToken.payload as ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData>, 'token'>;

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
