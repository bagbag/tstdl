import type { HttpValueMapInput } from './http-value-map.js';
import { HttpValueMap } from './http-value-map.js';
import type { HttpValueObject, NormalizedHttpValueObject } from './types.js';

export type HttpQueryObject = HttpValueObject;

export type NormalizedHttpQueryObject = NormalizedHttpValueObject;

export class HttpQuery extends HttpValueMap<HttpQuery> {
  constructor(input?: HttpValueMapInput) {
    super('query', false, input);
  }

  static fromURLSearchParams(urlSearchParams: URLSearchParams): HttpQuery {
    const query = new HttpQuery();

    for (const [key, value] of urlSearchParams) {
      query.append(key, value);
    }

    return query;
  }

  clone(): HttpQuery {
    return new HttpQuery(this);
  }
}
