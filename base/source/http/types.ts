import type { StringMap, UndefinableJson } from '#/types';

export type HttpHeaders = StringMap<string | string[]>;

export type HttpParameters = StringMap<string | string[]>;

export type HttpQuery = StringMap<string | string[]>;

export type HttpForm = StringMap<string | string[]>;

export enum HttpBodyType {
  None = 0,
  Auto = 1,
  Text = 2,
  Json = 3,
  Stream = 4,
  Buffer = 5
}

export type HttpBody<B extends HttpBodyType>
  = B extends HttpBodyType.None ? undefined
  : B extends HttpBodyType.Auto ? UndefinableJson | string | ArrayBuffer | undefined
  : B extends HttpBodyType.Text ? string
  : B extends HttpBodyType.Json ? UndefinableJson
  : B extends HttpBodyType.Stream ? AsyncIterable<ArrayBuffer>
  : B extends HttpBodyType.Buffer ? ArrayBuffer
  : undefined;
