import type { StringMap } from '../types';
import { decodeBase64Url, encodeBase64Url } from './base64';
import { assert } from './type-guards';
import type { BinaryLike } from 'crypto';
import { createHmac } from 'crypto';
import { UnauthorizedError } from '../error';

export enum JwtTokenAlgorithm {
  SHA256 = 'HS256',
  SHA384 = 'HS384',
  SHA512 = 'HS512'
}

export type JwtTokenHeader<T extends StringMap = StringMap> = {
  alg: JwtTokenAlgorithm,
  typ: 'JWT'
} & T;

export type JwtToken<THeader extends JwtTokenHeader = JwtTokenHeader, TPayload = StringMap> = {
  readonly header: THeader,
  readonly payload: TPayload
};

export type JwtTokenParseResult<THeader extends JwtTokenHeader = JwtTokenHeader, TPayload extends StringMap = StringMap> = {
  raw: string,
  token: JwtToken<THeader, TPayload>,
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

export function parseJwtTokenString<THeader extends JwtTokenHeader, TPayload = StringMap>(tokenString: string): JwtTokenParseResult<THeader, TPayload> {
  const splits = tokenString.split('.');

  assert(splits.length == 3, 'invalid token');

  const [encodedHeader, encodedPayload, encodedSignature] = splits;

  const textDecoder = new TextDecoder();

  const encoded: JwtTokenParseResult['encoded'] = {
    header: encodedHeader!,
    payload: encodedPayload!,
    signature: encodedSignature!
  };

  const bytes: JwtTokenParseResult['bytes'] = {
    header: decodeBase64Url(encodedHeader!),
    payload: decodeBase64Url(encodedPayload!),
    signature: decodeBase64Url(encodedSignature!)
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
    raw: tokenString,
    token,
    encoded,
    bytes,
    string
  };
}

export function createJwtTokenString<THeader extends JwtTokenHeader, TPayload extends StringMap>({ header, payload }: JwtToken<THeader, TPayload>, secret: BinaryLike): string {
  const headerBuffer = Buffer.from(JSON.stringify(header), 'utf8');
  const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');

  const encodedHeader = encodeBase64Url(headerBuffer, 0, headerBuffer.byteLength);
  const encodedPayload = encodeBase64Url(payloadBuffer, 0, payloadBuffer.byteLength);

  const headerPayloadDataString = `${encodedHeader}.${encodedPayload}`;
  const headerPayloadData = Buffer.from(headerPayloadDataString, 'utf8');

  const signature = getSignature(headerPayloadData, header.alg, secret);
  const encodedSignature = encodeBase64Url(signature);

  const token = `${headerPayloadDataString}.${encodedSignature}`;
  return token;
}

export function parseAndValidateJwtTokenString<THeader extends JwtTokenHeader = JwtTokenHeader, TPayload = StringMap>(tokenString: string, secret: BinaryLike): JwtToken<THeader, TPayload> {
  try {
    const { encoded, bytes, token } = parseJwtTokenString<THeader, TPayload>(tokenString);

    const calculatedSignature = getSignature(`${encoded.header}.${encoded.payload}`, token.header.alg, secret);
    const validSignature = calculatedSignature.equals(Buffer.from(bytes.signature));

    if (!validSignature) {
      throw new UnauthorizedError('invalid token signature');
    }

    return token;
  }
  catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError('invalid token');
  }
}

function getSignature(data: BinaryLike, algorithm: JwtTokenAlgorithm, secret: BinaryLike): Buffer {
  const hmac = createHmac(getCryptoAlgorithm(algorithm), secret);
  return hmac.update(data).digest();
}

function getCryptoAlgorithm(algorithm: JwtTokenAlgorithm): string {
  return algorithm.replace('HS', 'sha');
}
