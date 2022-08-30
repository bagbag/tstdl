import { singleton } from '#/container';
import { ForbiddenError, NotImplementedError } from '#/error';
import type { HttpRequestAuthorization } from '#/http/client';
import { HttpClient } from '#/http/client';
import { HttpHeaders } from '#/http/http-headers';
import { object, optional, Schema, string } from '#/schema';
import type { Json, Record } from '#/types';
import { Alphabet } from '#/utils/alphabet';
import { digest } from '#/utils/cryptography';
import { currentTimestamp } from '#/utils/date-time';
import type { JwtToken, JwtTokenHeader } from '#/utils/jwt';
import { parseJwtTokenString } from '#/utils/jwt';
import { getRandomString } from '#/utils/random';
import { assertNumberPass, isUndefined } from '#/utils/type-guards';
import { OidcConfigurationService } from './oidc-configuration.service';
import type { NewOidcState, OidcState } from './oidc-state.model';
import { OidcStateRepository } from './oidc-state.repository';
import type { OidcGetTokenParameters, OidcInitParameters, OidcInitResult, OidcRefreshTokenParameters, OidcToken } from './oidc.service-model';

type OidcJwtTokenPayload = {
  exp: number
};

type OidcJwtToken = JwtToken<JwtTokenHeader, OidcJwtTokenPayload>;

const tokenResponseSchema = object({
  /* eslint-disable @typescript-eslint/naming-convention */
  access_token: string(),
  id_token: string(),
  token_type: string(),
  refresh_token: optional(string())
  /* eslint-enable @typescript-eslint/naming-convention */
});

@singleton()
export class OidcService<Data = any> {
  private readonly oidcConfigurationService: OidcConfigurationService;
  private readonly oidcStateRepository: OidcStateRepository;

  constructor(oidcConfigurationService: OidcConfigurationService, oidcStateRepository: OidcStateRepository) {
    this.oidcConfigurationService = oidcConfigurationService;
    this.oidcStateRepository = oidcStateRepository;
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

  async getToken(parameters: OidcGetTokenParameters): Promise<OidcToken> {
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
          redirect_uri: parameters.redirectUri
          /* eslint-enable @typescript-eslint/naming-convention */
        };

        break;

      case 'client_credentials':
        formData = {
          /* eslint-disable @typescript-eslint/naming-convention */
          grant_type: 'client_credentials',

          scope: parameters.scope
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

    const tokenResponse = await HttpClient.instance.postJson<Json>(oidcConfiguration.tokenEndpoint, { headers, authorization, body: { form: formData } });
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

    const tokenResponse = await HttpClient.instance.postJson<Json>(oidcConfiguration.tokenEndpoint, { headers: { authorization: `Bearer ${refreshToken}` }, body: { form: formData } });
    return parseTokenResponse(tokenResponse);
  }

  async getUserInfo(endpoint: string, token: OidcToken): Promise<unknown> {
    const oidcConfiguration = await this.oidcConfigurationService.getConfiguration(endpoint);
    const userInfoResponse = await HttpClient.instance.getJson(oidcConfiguration.userinfoEndpoint, { headers: { authorization: `${token.tokenType} ${token.accessToken}` } });

    return userInfoResponse;
  }
}

function parseTokenResponse(response: Json): OidcToken {
  const { access_token, id_token, token_type, refresh_token } = Schema.parse(tokenResponseSchema, response, { mask: true }); // eslint-disable-line @typescript-eslint/naming-convention

  const decodedToken = parseJwtTokenString<OidcJwtToken>(id_token);

  const token: OidcToken = {
    tokenType: token_type,
    expiration: assertNumberPass(decodedToken.token.payload.exp) * 1000,
    accessToken: access_token,
    refreshToken: refresh_token,
    raw: response
  };

  return token;
}
