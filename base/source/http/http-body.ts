import type { UndefinableJson } from '#/types/index.js';
import type { AnyIterable } from '#/utils/any-iterable-iterator.js';
import { isNotNullOrUndefined, isNullOrUndefined } from '#/utils/type-guards.js';
import type { HttpHeaders } from './http-headers.js';
import type { ReadBodyOptions } from './utils.js';
import { readBody, readBodyAsBinaryStream, readBodyAsBuffer, readBodyAsJson, readBodyAsStream, readBodyAsText, readBodyAsTextStream } from './utils.js';

export type HttpBodySource = undefined | Uint8Array<ArrayBuffer> | Blob | AnyIterable<Uint8Array<ArrayBuffer>> | ReadableStream<Uint8Array<ArrayBuffer>>;

export class HttpBody {
  private readonly body: HttpBodySource;
  private readonly headers: HttpHeaders;

  private bodyAlreadyRead: boolean;

  get available(): boolean {
    return isNotNullOrUndefined(this.body);
  }

  get byteLength(): number | undefined {
    return this.headers.contentLength;
  }

  constructor(body: HttpBodySource, headers: HttpHeaders) {
    this.body = body;
    this.headers = headers;

    this.bodyAlreadyRead = false;
  }

  async readAsBuffer(options?: ReadBodyOptions): Promise<Uint8Array<ArrayBuffer>> {
    this.prepareBodyRead();
    return await readBodyAsBuffer(this.body!, this.headers, options);
  }

  async readAsText(options?: ReadBodyOptions): Promise<string> {
    this.prepareBodyRead();
    return await readBodyAsText(this.body!, this.headers, options);
  }

  async readAsJson<T = UndefinableJson>(options?: ReadBodyOptions): Promise<T> {
    this.prepareBodyRead();
    return await (readBodyAsJson(this.body!, this.headers, options) as Promise<T>);
  }

  async read(options?: ReadBodyOptions): Promise<string | UndefinableJson | Uint8Array> {
    this.prepareBodyRead();
    return await readBody(this.body!, this.headers, options);
  }

  readAsBinaryStream(options?: ReadBodyOptions): ReadableStream<Uint8Array> {
    this.prepareBodyRead();
    return readBodyAsBinaryStream(this.body!, this.headers, options);
  }

  readAsTextStream(options?: ReadBodyOptions): ReadableStream<string> {
    this.prepareBodyRead();
    return readBodyAsTextStream(this.body!, this.headers, options);
  }

  readAsStream(options?: ReadBodyOptions): ReadableStream<string> | ReadableStream<Uint8Array> {
    this.prepareBodyRead();
    return readBodyAsStream(this.body!, this.headers, options);
  }

  private prepareBodyRead(): void {
    if (isNullOrUndefined(this.body)) {
      throw new Error('Body not available.');
    }

    if (this.bodyAlreadyRead) {
      throw new Error('Body was already read.');
    }

    this.bodyAlreadyRead = true;
  }
}
