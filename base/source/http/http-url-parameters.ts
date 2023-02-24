import type { HttpValueMapInput } from './http-value-map.js';
import { HttpValueMap } from './http-value-map.js';
import type { HttpValueObject, NormalizedHttpValueObject } from './types.js';

export type HttpUrlParametersObject = HttpValueObject;

export type NormalizedHttpUrlParametersObject = NormalizedHttpValueObject;

export class HttpUrlParameters extends HttpValueMap<HttpUrlParameters> {
  constructor(input?: HttpValueMapInput) {
    super('url-parameter', false, input);
  }

  clone(): HttpUrlParameters {
    return new HttpUrlParameters(this);
  }
}
