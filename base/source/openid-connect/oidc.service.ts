import { inject, optional as injectOptional, singleton } from '#/container/index.js';
import { ForbiddenError } from '#/error/forbidden.error.js';
import { NotImplementedError } from '#/error/not-implemented.error.js';
import type { HttpRequestAuthorization } from '#/http/client/index.js';
import { HttpClient } from '#/http/client/index.js';
import { HttpHeaders } from '#/http/http-headers.js';
import { object, optional, Schema, string } from '#/schema/index.js';
import type { Json, Record } from '#/types.js';
import { Alphabet } from '#/utils/alphabet.js';
import { digest } from '#/utils/cryptography.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { getRandomString } from '#/utils/random.js';
import { assertDefinedPass, isUndefined } from '#/utils/type-guards.js';
import { OidcConfigurationService } from './oidc-configuration.service.js';
import type { NewOidcState, OidcState } from './oidc-state.model.js';
import { OidcStateRepository } from './oidc-state.repository.js';
import type { OidcGetTokenParameters, OidcInitParameters, OidcInitResult, OidcRefreshTokenParameters, OidcToken } from './oidc.service-model.js';

const tokenResponseSchema = object({
  /* eslint-disable @typescript-eslint/naming-convention */
  access_token: string(),
  id_token: optional(string()),
  token_type: string(),
  refresh_token: optional(string())
  /* eslint-enable @typescript-eslint/naming-convention */
});

@singleton()
export class OidcService<Data = any> {
  private readonly oidcConfigurationService: OidcConfigurationService;
  private readonly maybeOidcStateRepository: OidcStateRepository | undefined;
  private readonly httpClient: HttpClient;

  private get oidcStateRepository(): OidcStateRepository {
    return assertDefinedPass(this.maybeOidcStateRepository, 'OidcStateRepository is not provided but required.');
  }

  constructor(oidcConfigurationService: OidcConfigurationService, @inject(OidcStateRepository) @injectOptional() oidcStateRepository: OidcStateRepository | undefined, httpClient: HttpClient) {
    this.oidcConfigurationService = oidcConfigurationService;
    this.maybeOidcStateRepository = oidcStateRepository;
    this.httpClient = httpClient;
  }

  async initAuthorization({ endpoint, clientId, clientSecret, scope, expiration, data }: OidcInitParameters<Data>): Promise<OidcInitResult> {
    const oidcConfiguration = await this.oidcConfigurationService.getConfiguration(endpoint);

    const state: NewOidcState = {
      value: getRandomString(64, Alphabet.LowerUpperCaseNumbers),
      codeVerifier: getRandomString(64, Alphabet.LowerUpperCaseNumbers),
      endpoint,
      clientId,
      clientSecret,
      expiration: currentTimestamp() + expiration,
      data
    };

    await this.oidcStateRepository.insert(state);

    const codeChallenge = await digest('SHA-256', state.codeVerifier).toBase64Url();

    const result: OidcInitResult = {
      authorizationEndpoint: oidcConfiguration.authorizationEndpoint,
      state: state.value,
      clientId,
      scope,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };

    return result;
  }

  async getState(state: string): Promise<OidcState<Data>> {
    return this.oidcStateRepository.loadByFilter({ value: state });
  }

  async deleteState(state: string): Promise<void> {
    await this.oidcStateRepository.deleteByFilter({ value: state });
  }

  async validateState(state: string): Promise<OidcState<Data>> {
    const oidcState = await this.oidcStateRepository.tryLoadByFilterAndDelete({ value: state });

    if (isUndefined(oidcState)) {
      throw new ForbiddenError('invalid state code');
    }

    return oidcState;
  }

  async getToken(parameters: OidcGetTokenParameters, additionalData?: Record<string, string>): Promise<OidcToken> {
    const oidcConfiguration = await this.oidcConfigurationService.getConfiguration(parameters.endpoint);

    const headers = new HttpHeaders();
    let formData: Record = {};
    let authorization: HttpRequestAuthorization | undefined;

    switch (parameters.grantType) {
      case 'authorization_code':
        headers.set('authorization', `Bearer ${parameters.code}`);

        formData = {
          /* eslint-disable @typescript-eslint/naming-convention */
          grant_type: 'authorization_code',
          client_id: parameters.clientId,
          client_secret: parameters.clientSecret,
          scope: parameters.scope,
          code: parameters.code,
          code_verifier: parameters.codeVerifier,
          redirect_uri: parameters.redirectUri,
          ...additionalData
          /* eslint-enable @typescript-eslint/naming-convention */
        };

        break;

      case 'client_credentials':
        formData = {
          /* eslint-disable @typescript-eslint/naming-convention */
          grant_type: 'client_credentials',
          scope: parameters.scope,
          ...additionalData
          /* eslint-enable @typescript-eslint/naming-convention */
        };

        break;

      default:
        throw new NotImplementedError(`Grant type "${(parameters as OidcGetTokenParameters).grantType}" not supported.`);
    }

    switch (parameters.authType) {
      case 'body':
      case undefined:
        formData['client_id'] = parameters.clientId;
        formData['client_secret'] = parameters.clientSecret;
        break;

      case 'basic-auth':
        authorization = {
          basic: {
            username: parameters.clientId,
            password: parameters.clientSecret
          }
        };
        break;

      default:
        throw new NotImplementedError(`Auth type "${(parameters as OidcGetTokenParameters).authType}" not supported.`);
    }

    const tokenResponse = await this.httpClient.postJson<Json>(oidcConfiguration.tokenEndpoint, { headers, authorization, body: { form: formData } });
    return parseTokenResponse(tokenResponse);
  }

  async refreshToken({ endpoint, clientId, clientSecret, refreshToken }: OidcRefreshTokenParameters): Promise<OidcToken> {
    const oidcConfiguration = await this.oidcConfigurationService.getConfiguration(endpoint);

    const formData = {
      /* eslint-disable @typescript-eslint/naming-convention */
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
      /* eslint-enable @typescript-eslint/naming-convention */
    };

    const tokenResponse = await this.httpClient.postJson<Json>(oidcConfiguration.tokenEndpoint, { headers: { authorization: `Bearer ${refreshToken}` }, body: { form: formData } });
    return parseTokenResponse(tokenResponse);
  }

  async getUserInfo(endpoint: string, token: OidcToken): Promise<unknown> {
    const oidcConfiguration = await this.oidcConfigurationService.getConfiguration(endpoint);

    if (isUndefined(oidcConfiguration.userInfoEndpoint)) {
      throw new Error('User info endpoint not supported.');
    }

    const userInfoResponse = await this.httpClient.getJson(oidcConfiguration.userInfoEndpoint, { headers: { authorization: `${token.tokenType} ${token.accessToken}` } });
    return userInfoResponse;
  }
}

function parseTokenResponse(response: Json): OidcToken {
  const { access_token, id_token, token_type, refresh_token } = Schema.parse(tokenResponseSchema, response, { mask: true }); // eslint-disable-line @typescript-eslint/naming-convention

  const token: OidcToken = {
    tokenType: token_type,
    accessToken: access_token,
    idToken: id_token,
    refreshToken: refresh_token,
    raw: response
  };

  return token;
}
