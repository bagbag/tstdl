import type { HttpValueMapInput } from './http-value-map';
import { HttpValueMap } from './http-value-map';
import type { HttpValueObject, NormalizedHttpValueObject } from './types';

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
