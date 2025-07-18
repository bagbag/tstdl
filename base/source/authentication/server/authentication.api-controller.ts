import { apiController } from '#/api/server/index.js';
import type { ApiController, ApiRequestContext, ApiServerResult } from '#/api/types.js';
import type { SetCookieOptions } from '#/cookie/cookie.js';
import { InvalidCredentialsError } from '#/errors/invalid-credentials.error.js';
import type { HttpServerResponseOptions, SetCookieObject } from '#/http/server/index.js';
import { HttpServerResponse } from '#/http/server/index.js';
import type { ObjectSchemaOrType, SchemaTestable } from '#/schema/index.js';
import type { Record, Type, TypedOmit } from '#/types.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { assertDefinedPass, isDefined } from '#/utils/type-guards.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { authenticationApiDefinition, getAuthenticationApiDefinition } from '../authentication.api.js';
import type { TokenResult } from './authentication.service.js';
import { AuthenticationService } from './authentication.service.js';
import { tryGetAuthorizationTokenStringFromRequest } from './helper.js';

const cookieBaseOptions: TypedOmit<SetCookieObject, 'value'> = { path: '/', httpOnly: true, secure: true, sameSite: 'strict' } satisfies SetCookieOptions;
const deleteCookie = { value: '', ...cookieBaseOptions, maxAge: -1 } satisfies SetCookieObject;

@apiController(authenticationApiDefinition)
export class AuthenticationApiController<AdditionalTokenPayload extends Record, AuthenticationData, AdditionalInitSecretResetData = void> implements ApiController<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>> {
  readonly authenticationService: AuthenticationService<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>;

  constructor(authenticationService: AuthenticationService<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>) {
    this.authenticationService = authenticationService;
  }

  async getToken({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'getToken'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'getToken'>> {
    const authenticationResult = await this.authenticationService.authenticate(parameters.subject, parameters.secret);

    if (!authenticationResult.success) {
      throw new InvalidCredentialsError();
    }

    const result = await this.authenticationService.getToken(authenticationResult.subject, parameters.data);

    return this.getTokenResponse(result);
  }

  async refresh({ request, parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'refresh'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'refresh'>> {
    const refreshTokenString = tryGetAuthorizationTokenStringFromRequest(request, 'refreshToken') ?? '';
    const result = await this.authenticationService.refresh(refreshTokenString, parameters.data);

    return this.getTokenResponse(result);
  }

  async impersonate({ request, parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'impersonate'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'impersonate'>> {
    const tokenString = tryGetAuthorizationTokenStringFromRequest(request) ?? '';
    const refreshTokenString = tryGetAuthorizationTokenStringFromRequest(request, 'refreshToken') ?? '';

    const impersonatorResult = await this.authenticationService.impersonate(tokenString, refreshTokenString, parameters.subject, parameters.data);

    return this.getTokenResponse(impersonatorResult);
  }

  async unimpersonate({ request, parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'unimpersonate'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'unimpersonate'>> {
    const impersonatorRefreshTokenString = tryGetAuthorizationTokenStringFromRequest(request, 'impersonatorRefreshToken') ?? '';
    const result = await this.authenticationService.refresh(impersonatorRefreshTokenString, parameters.data, { omitImpersonator: true });

    return this.getTokenResponse(result);
  }

  async endSession({ request }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'endSession'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'endSession'>> {
    let sessionId: string | undefined;

    try {
      const tokenString = tryGetAuthorizationTokenStringFromRequest(request) ?? '';
      const token = await this.authenticationService.validateToken(tokenString);
      sessionId = token.payload.sessionId;
    }
    catch (error) {
      try {
        const refreshTokenString = tryGetAuthorizationTokenStringFromRequest(request, 'refreshToken', true) ?? '';
        const refreshToken = await this.authenticationService.validateRefreshToken(refreshTokenString);
        sessionId = refreshToken.payload.sessionId;
      }
      catch {
        throw error;
      }
    }

    await this.authenticationService.endSession(sessionId);

    const result: ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'endSession'> = 'ok';

    return new HttpServerResponse({
      cookies: {
        authorization: deleteCookie,
        refreshToken: deleteCookie,
        impersonatorRefreshToken: deleteCookie,
      },
      body: {
        json: result,
      },
    });
  }

  async initSecretReset({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'initSecretReset'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'initSecretReset'>> {
    await this.authenticationService.initSecretReset(parameters.subject, parameters.data);
    return 'ok';
  }

  async resetSecret({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'resetSecret'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'resetSecret'>> {
    await this.authenticationService.resetSecret(parameters.token, parameters.newSecret);
    return 'ok';
  }

  async checkSecret({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'checkSecret'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'checkSecret'>> {
    return await this.authenticationService.checkSecret(parameters.secret);
  }

  timestamp(): ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'timestamp'> {
    return currentTimestamp();
  }

  protected getTokenResponse({ token, jsonToken, refreshToken, omitImpersonatorRefreshToken, impersonatorRefreshToken, impersonatorRefreshTokenExpiration }: TokenResult<AdditionalTokenPayload>): HttpServerResponse {
    const result: ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'getToken'> = jsonToken.payload as ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'getToken'>;

    const options: HttpServerResponseOptions = {
      cookies: {
        authorization: {
          value: `Bearer ${token}`,
          ...cookieBaseOptions,
          expires: jsonToken.payload.exp * 1000,
        },
        refreshToken: {
          value: `Bearer ${refreshToken}`,
          ...cookieBaseOptions,
          expires: jsonToken.payload.refreshTokenExp * 1000,
        },
      },
      body: {
        json: result,
      },
    };

    if (isDefined(impersonatorRefreshToken)) {
      options.cookies!['impersonatorRefreshToken'] = {
        value: `Bearer ${impersonatorRefreshToken}`,
        ...cookieBaseOptions,
        expires: assertDefinedPass(impersonatorRefreshTokenExpiration) * 1000,
      };
    }

    if (omitImpersonatorRefreshToken == true) {
      options.cookies!['impersonatorRefreshToken'] = deleteCookie;
    }

    return new HttpServerResponse(options);
  }
}

export function getAuthenticationApiController<AdditionalTokenPayload extends Record, AuthenticationData, AdditionalInitSecretResetData = void>( // eslint-disable-line @typescript-eslint/explicit-function-return-type
  additionalTokenPayloadSchema: ObjectSchemaOrType<AdditionalTokenPayload>,
  authenticationDataSchema: SchemaTestable<AuthenticationData>,
  additionalInitSecretResetData: SchemaTestable<AdditionalInitSecretResetData>
): Type<AuthenticationApiController<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>> {
  const apiDefinition = getAuthenticationApiDefinition(additionalTokenPayloadSchema, authenticationDataSchema, additionalInitSecretResetData);

  @apiController(apiDefinition)
  class AuthenticationApi extends AuthenticationApiController<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData> { }

  return AuthenticationApi;
}
