import { BadRequestError } from '#/error/bad-request.error';
import { numberPattern } from '#/utils/patterns';
import { isNotNumber, isNotString, isNullOrUndefined, isNumber, isString, isUndefined } from '#/utils/type-guards';
import type { HttpValueMapInput } from './http-value-map';
import { HttpValueMap } from './http-value-map';
import type { HttpValueObject, NormalizedHttpValueObject } from './types';

export type HttpHeadersObject = HttpValueObject;

export type NormalizedHttpHeadersObject = NormalizedHttpValueObject;

export class HttpHeaders extends HttpValueMap<HttpHeaders> {
  get accept(): string | undefined {
    return this.getStringHeader('Accept');
  }

  set accept(value: string | undefined) {
    this.set('Accept', value);
  }

  get contentType(): string | undefined {
    return this.getStringHeader('Content-Type');
  }

  set contentType(value: string | undefined) {
    this.set('Content-Type', value);
  }

  get contentLength(): number | undefined {
    return this.getNumberHeader('Content-Length');
  }

  set contentLength(value: number | undefined) {
    this.set('Content-Length', value);
  }

  get contentDisposition(): string | undefined {
    return this.getStringHeader('Content-Disposition');
  }

  set contentDisposition(value: string | undefined) {
    this.set('Content-Disposition', value);
  }

  get contentEncoding(): string | undefined {
    return this.getStringHeader('Content-Encoding');
  }

  set contentEncoding(value: string | undefined) {
    this.set('Content-Encoding', value);
  }

  /** get charset from {@link contentType} */
  get charset(): string | undefined {
    const contentType = this.contentType;

    if (isUndefined(contentType)) {
      return undefined;
    }

    const charset = contentType.split(';').find((value) => value.trim().startsWith('charset='));
    return charset?.split('=')[1]?.trim();
  }

  constructor(input?: HttpValueMapInput) {
    super('header', true, input);
  }

  clone(): HttpHeaders {
    return new HttpHeaders(this);
  }

  private getNumberHeader(name: string): number | undefined {
    const value = this.tryGet(name);

    if (isNullOrUndefined(value)) {
      return undefined;
    }

    if (isNumber(value)) {
      return value;
    }

    if (isString(value) && numberPattern.test(value)) {
      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        throw new BadRequestError(`invalid ${name} header`);
      }

      return numberValue;
    }

    if (isNotNumber(value)) {
      throw new BadRequestError(`invalid ${name} header`);
    }

    return value;
  }

  private getStringHeader(name: string): string | undefined {
    const value = this.tryGet(name);

    if (isNullOrUndefined(value)) {
      return undefined;
    }

    if (isNotString(value)) {
      throw new BadRequestError(`invalid ${name} header`);
    }

    return value;
  }
}