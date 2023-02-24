import { optional, singleton } from '#/container/index.js';
import { HttpClient } from '#/http/client/http-client.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { isDefined } from '#/utils/type-guards.js';
import { millisecondsPerMinute } from '#/utils/units.js';
import type { OidcConfiguration } from './oidc-configuration.service.js';
import { OidcConfigurationService } from './oidc-configuration.service.js';

type OidcConfigurationCache = {
  expiration: number,
  configuration: Promise<OidcConfiguration>
};

@singleton()
export class CachedOidcConfigurationService extends OidcConfigurationService {
  private readonly cacheDuration: number;
  private readonly cache: Map<string, OidcConfigurationCache>;

  constructor(httpClient: HttpClient, @optional() cacheDuration: number = 5 * millisecondsPerMinute) {
    super(httpClient);

    this.cacheDuration = cacheDuration;
    this.cache = new Map();
  }

  override async getConfiguration(endpoint: string): Promise<OidcConfiguration> {
    const cached = this.cache.get(endpoint);
    const now = currentTimestamp();

    if (isDefined(cached) && cached.expiration > now) {
      return cached.configuration;
    }

    const configuration = super.getConfiguration(endpoint);
    this.cache.set(endpoint, { expiration: now + this.cacheDuration, configuration });

    return configuration;
  }
}
