import { apiController } from '#/api/server/index.js';
import type { ApiController, ApiRequestContext, ApiServerResult } from '#/api/types.js';
import type { SetCookieOptions } from '#/cookie/cookie.js';
import type { HttpServerResponseOptions, SetCookieObject } from '#/http/server/index.js';
import { HttpServerResponse } from '#/http/server/index.js';
import type { ObjectSchemaOrType, SchemaTestable } from '#/schema/index.js';
import type { Record, Type, TypedOmit } from '#/types/index.js';
import { currentTimestampSeconds } from '#/utils/date-time.js';
import { assertDefinedPass, isDefined } from '#/utils/type-guards.js';
import type { AuthenticationApiDefinition } from '../authentication.api.js';
import { authenticationApiDefinition, getAuthenticationApiDefinition } from '../authentication.api.js';
import type { TokenResult } from './authentication.service.js';
import { AuthenticationService } from './authentication.service.js';
import { tryGetAuthorizationTokenStringFromRequest } from './helper.js';

const cookieBaseOptions: TypedOmit<SetCookieObject, 'value'> = { path: '/', httpOnly: true, secure: true, sameSite: 'strict' } satisfies SetCookieOptions;
const deleteCookie = { value: '', ...cookieBaseOptions, maxAge: -1 } satisfies SetCookieObject;

/**
 * API controller for authentication.
 *
 * @template AdditionalTokenPayload Type of additional token payload
 * @template AuthenticationData Type of additional authentication data
 * @template AdditionalInitSecretResetData Type of additional secret reset data
 */
@apiController(authenticationApiDefinition)
export class AuthenticationApiController<AdditionalTokenPayload extends Record, AuthenticationData, AdditionalInitSecretResetData = void> implements ApiController<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>> {
  readonly authenticationService: AuthenticationService<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>;

  constructor(authenticationService: AuthenticationService<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>) {
    this.authenticationService = authenticationService;
  }

  /**
   * Get a token for a subject and secret.
   * @param parameters The parameters for the request.
   * @returns The token result.
   */
  async login({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'login'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'login'>> {
    const result = await this.authenticationService.login(parameters.subject, parameters.secret, parameters.data);
    return this.getTokenResponse(result);
  }

  /**
   * Refresh a token.
   * @param request The request context.
   * @param parameters The parameters for the request.
   * @returns The token result.
   */
  async refresh({ request, parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'refresh'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'refresh'>> {
    const refreshTokenString = tryGetAuthorizationTokenStringFromRequest(request, 'refreshToken') ?? '';
    const result = await this.authenticationService.refresh(refreshTokenString, parameters.data);

    return this.getTokenResponse(result);
  }

  /**
   * Impersonate a subject.
   * @param request The request context.
   * @param parameters The parameters for the request.
   * @returns The token result.
   */
  async impersonate({ request, parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'impersonate'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'impersonate'>> {
    const tokenString = tryGetAuthorizationTokenStringFromRequest(request) ?? '';
    const refreshTokenString = tryGetAuthorizationTokenStringFromRequest(request, 'refreshToken') ?? '';

    const impersonatorResult = await this.authenticationService.impersonate(tokenString, refreshTokenString, parameters.subject, parameters.data);

    return this.getTokenResponse(impersonatorResult);
  }

  /**
   * Unimpersonate a subject.
   * @param request The request context.
   * @param parameters The parameters for the request.
   * @returns The token result.
   */
  async unimpersonate({ request, parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'unimpersonate'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'unimpersonate'>> {
    const impersonatorRefreshTokenString = tryGetAuthorizationTokenStringFromRequest(request, 'impersonatorRefreshToken') ?? '';
    const result = await this.authenticationService.refresh(impersonatorRefreshTokenString, parameters.data, { omitImpersonator: true });

    return this.getTokenResponse(result);
  }

  /**
   * End a session.
   * @param request The request context.
   * @returns 'ok' if the session was ended.
   */
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

  async changeSecret({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'changeSecret'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'changeSecret'>> {
    await this.authenticationService.changeSecret(parameters.subject, parameters.currentSecret, parameters.newSecret);
    return 'ok';
  }

  /**
   * Initialize a secret reset.
   * @param parameters The parameters for the request.
   * @returns 'ok' if the secret reset was initialized.
   */
  async initSecretReset({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'initSecretReset'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'initSecretReset'>> {
    await this.authenticationService.initSecretReset(parameters.subject, parameters.data);
    return 'ok';
  }

  /**
   * Reset a secret.
   * @param parameters The parameters for the request.
   * @returns 'ok' if the secret was reset.
   */
  async resetSecret({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'resetSecret'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'resetSecret'>> {
    await this.authenticationService.resetSecret(parameters.token, parameters.newSecret);
    return 'ok';
  }

  /**
   * Check a secret.
   * @param parameters The parameters for the request.
   * @returns The result of the secret check.
   */
  async checkSecret({ parameters }: ApiRequestContext<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'checkSecret'>): Promise<ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'checkSecret'>> {
    return await this.authenticationService.checkSecret(parameters.secret);
  }

  /**
   * Get the current server timestamp.
   * @returns The current server timestamp in seconds.
   */
  timestamp(): ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'timestamp'> {
    return currentTimestampSeconds();
  }

  protected getTokenResponse({ token, jsonToken, refreshToken, omitImpersonatorRefreshToken, impersonatorRefreshToken, impersonatorRefreshTokenExpiration }: TokenResult<AdditionalTokenPayload>): HttpServerResponse {
    const result: ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'login'> = jsonToken.payload as ApiServerResult<AuthenticationApiDefinition<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>, 'login'>;

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

/**
 * Get an authentication API controller.
 * @param additionalTokenPayloadSchema Schema for additional token payload.
 * @param authenticationDataSchema Schema for additional authentication data.
 * @param additionalInitSecretResetData Schema for additional secret reset data.
 * @returns An authentication API controller.
 * @template AdditionalTokenPayload Type of additional token payload.
 * @template AuthenticationData Type of additional authentication data.
 * @template AdditionalInitSecretResetData Type of additional secret reset data.
 */
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
