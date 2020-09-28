import type { StringMap } from '../types';
import { decodeBase64Url } from './base64';

export enum JwtTokenAlgorithm {
  SHA256 = 'HS256',
  SHA384 = 'HS384',
  SHA512 = 'HS512'
}

export type JwtTokenHeader = StringMap & {
  alg: JwtTokenAlgorithm,
  typ: 'JWT'
};

export type JwtToken<THeader extends JwtTokenHeader = JwtTokenHeader, TPayload = StringMap> = {
  readonly header: THeader,
  readonly payload: TPayload
};

type JwtTokenParseResult<T extends JwtToken> = {
  raw: string,
  token: T,
  encoded: {
    header: string,
    payload: string,
    signature: string
  },
  bytes: {
    header: ArrayBuffer,
    payload: ArrayBuffer,
    signature: ArrayBuffer
  },
  string: {
    header: string,
    payload: string
  }
};

export function parseJwtTokenString<T extends JwtToken>(tokenString: string): JwtTokenParseResult<T> {
  const [encodedHeader, encodedPayload, encodedSignature] = tokenString.split('.');

  const textDecoder = new TextDecoder();

  const encoded: JwtTokenParseResult<T>['encoded'] = {
    header: encodedHeader,
    payload: encodedPayload,
    signature: encodedSignature
  };

  const bytes: JwtTokenParseResult<T>['bytes'] = {
    header: decodeBase64Url(encodedHeader),
    payload: decodeBase64Url(encodedPayload),
    signature: decodeBase64Url(encodedSignature)
  };

  const string: JwtTokenParseResult<T>['string'] = {
    header: textDecoder.decode(bytes.header),
    payload: textDecoder.decode(bytes.payload)
  };

  const header = JSON.parse(string.header) as T['header'];
  const payload = JSON.parse(string.payload) as T['payload'];

  const token: T = {
    header,
    payload
  };

  return {
    raw: tokenString,
    token,
    encoded,
    bytes,
    string
  };
}
