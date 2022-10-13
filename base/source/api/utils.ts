import { toArray } from '#/utils/array/array';
import { compareByValueDescending } from '#/utils/comparison';
import { isDefined, isNull } from '#/utils/type-guards';
import type { ApiDefinition, ApiEndpointDefinition } from './types';

type GetApiEndpointUrlData = {
  api: ApiDefinition,
  endpoint: ApiEndpointDefinition,
  prefix: string | undefined,
  explicitVersion?: number | null
};

export function getFullApiEndpointResource({ api, endpoint, prefix, explicitVersion }: GetApiEndpointUrlData): string {
  const version = toArray(isDefined(explicitVersion) ? explicitVersion : endpoint.version).sort(compareByValueDescending)[0];
  const versionPrefix = isNull(version) ? '' : `v${version ?? 1}/`;
  const rootResource = endpoint.rootResource ?? api.resource;
  const subResource = isDefined(endpoint.resource) ? `/${endpoint.resource}` : '';

  return `/${prefix ?? 'api/'}${versionPrefix}${rootResource}${subResource}`;
}
