import type { HttpValueMapInput } from './http-value-map.js';
import { HttpValueMap } from './http-value-map.js';
import type { HttpValueObject, NormalizedHttpValueObject } from './types.js';

export type HttpFormObject = HttpValueObject;

export type NormalizedHttpFormObject = NormalizedHttpValueObject;

export class HttpForm extends HttpValueMap<HttpForm> {
  constructor(input?: HttpValueMapInput) {
    super('form', false, input);
  }

  static fromURLSearchParams(urlSearchParams: URLSearchParams): HttpForm {
    const query = new HttpForm();

    for (const [key, value] of urlSearchParams) {
      query.append(key, value);
    }

    return query;
  }

  clone(): HttpForm {
    return new HttpForm(this);
  }
}
