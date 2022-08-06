import { singleton } from '#/container';
import { HttpClient } from '#/http/client';
import { object, optional, Schema, string } from '#/schema';

export type OidcConfiguration = {
  authorizationEndpoint: string,
  tokenEndpoint: string,
  revocationEndpoint?: string,
  userinfoEndpoint: string
};

const oidcConfigurationSchema = object({
  /* eslint-disable @typescript-eslint/naming-convention */
  authorization_endpoint: string(),
  token_endpoint: string(),
  revocation_endpoint: optional(string()),
  userinfo_endpoint: string()
  /* eslint-enable @typescript-eslint/naming-convention */
});

@singleton()
export class OidcConfigurationService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async getConfiguration(endpoint: string): Promise<OidcConfiguration> {
    const wellKnownUrl = `${endpoint}/.well-known/openid-configuration`;

    const configurationResponse = await this.httpClient.getJson(wellKnownUrl);
    const { authorization_endpoint, token_endpoint, revocation_endpoint, userinfo_endpoint } = Schema.parse(oidcConfigurationSchema, configurationResponse, { mask: true }); // eslint-disable-line @typescript-eslint/naming-convention

    const oidcConfiguration: OidcConfiguration = {
      authorizationEndpoint: authorization_endpoint,
      tokenEndpoint: token_endpoint,
      revocationEndpoint: revocation_endpoint,
      userinfoEndpoint: userinfo_endpoint
    };

    return oidcConfiguration;
  }
}
