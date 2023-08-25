import { Singleton } from '#/injector/decorators.js';
import { HttpClient } from '#/http/client/index.js';
import { object, optional, Schema, string } from '#/schema/index.js';

export type OidcConfiguration = {
  authorizationEndpoint: string,
  tokenEndpoint: string,
  revocationEndpoint?: string,
  userInfoEndpoint?: string,
  endSessionEndpoint?: string
};

const oidcConfigurationSchema = object({
  /* eslint-disable @typescript-eslint/naming-convention */
  authorization_endpoint: string(),
  token_endpoint: string(),
  revocation_endpoint: optional(string()),
  userinfo_endpoint: optional(string()),
  end_session_endpoint: optional(string())
  /* eslint-enable @typescript-eslint/naming-convention */
});

@Singleton()
export class OidcConfigurationService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async getConfiguration(endpoint: string): Promise<OidcConfiguration> {
    const wellKnownUrl = `${endpoint}/.well-known/openid-configuration`;

    const configurationResponse = await this.httpClient.getJson(wellKnownUrl);
    const { authorization_endpoint, token_endpoint, revocation_endpoint, userinfo_endpoint, end_session_endpoint } = Schema.parse(oidcConfigurationSchema, configurationResponse, { mask: true }); // eslint-disable-line @typescript-eslint/naming-convention

    const oidcConfiguration: OidcConfiguration = {
      authorizationEndpoint: authorization_endpoint,
      tokenEndpoint: token_endpoint,
      revocationEndpoint: revocation_endpoint,
      userInfoEndpoint: userinfo_endpoint,
      endSessionEndpoint: end_session_endpoint
    };

    return oidcConfiguration;
  }
}
