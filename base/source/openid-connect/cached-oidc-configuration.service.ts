import { currentTimestamp } from '#/utils';
import type { OidcConfiguration, OidcConfigurationService } from './oidc-configuration.service';

type OidcConfigurationCache = {
  expiration: number,
  configuration: Promise<OidcConfiguration>
};

export class CachedOidcConfigurationService implements OidcConfigurationService {
  private readonly oidcConfigurationService: OidcConfigurationService;
  private readonly cacheDuration: number;
  private readonly cache: Map<string, OidcConfigurationCache>;

  constructor(oidcConfigurationService: OidcConfigurationService, cacheDuration: number) {
    this.oidcConfigurationService = oidcConfigurationService;
    this.cacheDuration = cacheDuration;

    this.cache = new Map();
  }

  async getConfiguration(endpoint: string): Promise<OidcConfiguration> {
    const cached = this.cache.get(endpoint);
    const now = currentTimestamp();

    const refreshRequired = (cached == undefined || cached.expiration <= now);

    const configuration = refreshRequired
      ? this.oidcConfigurationService.getConfiguration(endpoint)
      : cached!.configuration;

    if (refreshRequired) {
      this.cache.set(endpoint, { expiration: now + this.cacheDuration, configuration });
    }

    return configuration;
  }
}
