import type { UndefinableJsonObject, UndefinableJsonPrimitive } from '../types';
import { singleton } from './singleton';
import { isArray, isDefined, isNull, isObject, isUndefined } from './type-guards';

enum UrlBuilderPartType {
  Literal = 0,
  Parameter = 1
}

type UrlBuilderPart = {
  type: UrlBuilderPartType,
  value: string
};

export type UrlBuilderParameterValue = UndefinableJsonPrimitive;
export type UrlBuilderParameters = UndefinableJsonObject;
export type UrlBuilderOptions = { separator?: string };
export type UrlBuilderResult = { parsedUrl: string, parametersRest: UrlBuilderParameters };

const builderScope = Symbol('url-builder cache');
const urlParseRegex = /([^:]+|:\/+)|:([\w-]+)/ug;
const isFullUrlRegex = /^\w+:\/\//u;

// eslint-disable-next-line max-lines-per-function
export function compileUrlBuilder(url: string): (parameters?: UrlBuilderParameters, options?: UrlBuilderOptions) => UrlBuilderResult {
  const parts: UrlBuilderPart[] = [];
  const isFullUrl = isFullUrlRegex.test(url);

  let parseUrl = url;

  if (isFullUrl) {
    const { origin } = new URL(url);
    parts.push({ type: UrlBuilderPartType.Literal, value: origin });
    parseUrl = url.slice(origin.length);
  }

  const matches = parseUrl.matchAll(urlParseRegex);

  for (const [, literal, parameter] of matches) {
    if (isDefined(literal)) {
      parts.push({ type: UrlBuilderPartType.Literal, value: literal });
    }
    else if (isDefined(parameter)) {
      parts.push({ type: UrlBuilderPartType.Parameter, value: parameter });
    }
    else {
      throw new Error('something went wrong');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  return function buildUrl(parameters: UrlBuilderParameters = {}, { separator = ',' }: UrlBuilderOptions = {}): UrlBuilderResult {
    let parsedUrl = '';
    let parametersRest = parameters;

    for (const part of parts) {
      if (part.type == UrlBuilderPartType.Literal) {
        parsedUrl += part.value;
      }
      else {
        const { [part.value]: value, ...rest } = parametersRest;
        parametersRest = rest;

        if (isUndefined(value)) {
          throw new Error(`url parameter ${part.value} not provided`);
        }

        if (isObject(value)) {
          throw new Error(`url parameter ${part.value} is a object`);
        }

        parsedUrl += isArray(value) ? value.join(separator) : (isNull(value) ? '[[null]]' : value.toString());
      }
    }

    return { parsedUrl, parametersRest };
  };
}

export function buildUrl(url: string, parameters: UrlBuilderParameters = {}, options?: UrlBuilderOptions): UrlBuilderResult {
  const builder = singleton(builderScope, url, () => compileUrlBuilder(url));
  return builder(parameters, options);
}
