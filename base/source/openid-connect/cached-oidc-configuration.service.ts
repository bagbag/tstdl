import { singleton } from '#/container';
import { HttpClient } from '#/http';
import { currentTimestamp } from '#/utils/date-time';
import { isUndefined } from '#/utils/type-guards';
import type { OidcConfiguration } from './oidc-configuration.service';
import { OidcConfigurationService } from './oidc-configuration.service';

type OidcConfigurationCache = {
  expiration: number,
  configuration: Promise<OidcConfiguration>
};

@singleton()
export class CachedOidcConfigurationService extends OidcConfigurationService {
  private readonly cacheDuration: number;
  private readonly cache: Map<string, OidcConfigurationCache>;

  constructor(httpClient: HttpClient, cacheDuration: number) {
    super(httpClient);

    this.cacheDuration = cacheDuration;

    this.cache = new Map();
  }

  override async getConfiguration(endpoint: string): Promise<OidcConfiguration> {
    const cached = this.cache.get(endpoint);
    const now = currentTimestamp();

    const refreshRequired = (isUndefined(cached) || cached.expiration <= now);

    const configuration = refreshRequired
      ? super.getConfiguration(endpoint)
      : cached.configuration;

    if (refreshRequired) {
      this.cache.set(endpoint, { expiration: now + this.cacheDuration, configuration });
    }

    return configuration;
  }
}
