import type { StringMap } from '../types';
import { matchAll } from './helpers';
import { singleton } from './singleton';
import { isDefined } from './type-guards';

enum UrlBuilderPartType {
  Literal = 0,
  Parameter = 1
}

type UrlBuilderPart = {
  type: UrlBuilderPartType,
  value: string
};

type ParameterValue = string | number | boolean | undefined;
type UrlBuilderParameters = StringMap<ParameterValue | ParameterValue[]>;
type UrlBuilderReturnType = { parsedUrl: string, parametersRest: UrlBuilderParameters };

const builderScope = Symbol('url-builder cache');
const urlParseRegex = /([^:]+|:\/+)|:([\w-]+)/ug;
const isFullUrlRegex = /^\w+:\/\//u;

export function compileUrlBuilder(url: string): (parameters?: UrlBuilderParameters) => UrlBuilderReturnType {
  const parts: UrlBuilderPart[] = [];
  const isFullUrl = isFullUrlRegex.test(url);

  let parseUrl = url;

  if (isFullUrl) {
    const { origin, pathname } = new URL(url);
    parts.push({ type: UrlBuilderPartType.Literal, value: origin });
    parseUrl = pathname;
  }

  const matches = matchAll(urlParseRegex, parseUrl);

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
  return function buildUrl(parameters: UrlBuilderParameters = {}): UrlBuilderReturnType {
    let parsedUrl = '';
    let parametersRest = parameters;

    for (const part of parts) {
      if (part.type == UrlBuilderPartType.Literal) {
        parsedUrl += part.value;
      }
      else {
        if (!Object.prototype.hasOwnProperty.call(parametersRest, part.value)) {
          throw new Error(`parameter ${part.value} not found`);
        }

        const { [part.value]: value, ...rest } = parametersRest;
        parametersRest = rest;
        parsedUrl += Array.isArray(value) ? value.join(',') : value;
      }
    }

    return { parsedUrl, parametersRest };
  };
}

export function buildUrl(url: string, parameters: UrlBuilderParameters = {}): UrlBuilderReturnType {
  const builder = singleton(builderScope, url, () => compileUrlBuilder(url));
  return builder(parameters);
}
