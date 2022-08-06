import { singleton } from '#/container';
import { ForbiddenError } from '#/error';
import { HttpClient } from '#/http/client';
import { object, optional, Schema, string } from '#/schema';
import type { Json } from '#/types';
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

  async getToken({ endpoint, clientId, clientSecret, code, redirectUri, codeVerifier, scope }: OidcGetTokenParameters): Promise<OidcToken> {
    const oidcConfiguration = await this.oidcConfigurationService.getConfiguration(endpoint);

    const formData = {
      /* eslint-disable @typescript-eslint/naming-convention */
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      scope,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
      /* eslint-enable @typescript-eslint/naming-convention */
    };

    const tokenResponse = await HttpClient.instance.postJson<Json>(oidcConfiguration.tokenEndpoint, { headers: { authorization: `Bearer ${code}` }, body: { form: formData } });
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
