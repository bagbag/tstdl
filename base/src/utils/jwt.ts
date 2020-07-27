import { StringMap } from '../types';
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

type JwtTokenParseResult<THeader extends JwtTokenHeader = JwtTokenHeader, TPayload = unknown> = {
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
  },
  token: JwtToken<THeader, TPayload>
};

export function parseJwtTokenString<THeader extends JwtTokenHeader = JwtTokenHeader, TPayload = StringMap>(tokenString: string): JwtTokenParseResult<THeader, TPayload> {
  const [encodedHeader, encodedPayload, encodedSignature] = tokenString.split('.');

  const textDecoder = new TextDecoder();

  const encoded: JwtTokenParseResult['encoded'] = {
    header: encodedHeader,
    payload: encodedPayload,
    signature: encodedSignature
  };

  const bytes: JwtTokenParseResult['bytes'] = {
    header: decodeBase64Url(encodedHeader),
    payload: decodeBase64Url(encodedPayload),
    signature: decodeBase64Url(encodedSignature)
  };

  const string: JwtTokenParseResult['string'] = {
    header: textDecoder.decode(bytes.header),
    payload: textDecoder.decode(bytes.payload)
  };

  const header = JSON.parse(string.header) as THeader;
  const payload = JSON.parse(string.payload) as TPayload;

  const token: JwtToken<THeader, TPayload> = {
    header,
    payload
  };

  return {
    encoded,
    bytes,
    string,
    token
  };
}
