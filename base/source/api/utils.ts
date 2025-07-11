import { toArray } from '#/utils/array/array.js';
import { compareByValueDescending } from '#/utils/comparison.js';
import { sort } from '#/utils/iterable-helpers/sort.js';
import { isDefined, isNull } from '#/utils/type-guards.js';
import type { ApiDefinition, ApiEndpointDefinition } from './types.js';

type GetApiEndpointUrlData = {
  api: ApiDefinition,
  endpoint: ApiEndpointDefinition,
  defaultPrefix: string | undefined | null,
  explicitVersion?: number | null,
};

export function getFullApiEndpointResource({ api, endpoint, defaultPrefix, explicitVersion }: GetApiEndpointUrlData): string {
  const versionArray = toArray(isDefined(explicitVersion) ? explicitVersion : endpoint.version);
  const version = sort(versionArray, compareByValueDescending)[0];
  const versionPrefix = isNull(version) ? undefined : `v${version ?? 1}`;
  const rootResource = (isNull(endpoint.rootResource) ? '' : endpoint.rootResource) ?? api.resource;
  const prefix = (isNull(endpoint.prefix) ? '' : endpoint.prefix) ?? (isNull(api.prefix) ? '' : api.prefix) ?? (isNull(defaultPrefix) ? undefined : (defaultPrefix ?? 'api'));

  const parts = [prefix, versionPrefix, rootResource, endpoint.resource];
  const path = parts.filter(isDefined).filter((part) => part.length > 0).join('/');

  return `/${path}`;
}
