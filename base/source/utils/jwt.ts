import { InvalidTokenError, UnauthorizedError } from '../error';
import type { BinaryData, StringMap } from '../types';
import { decodeBase64Url, encodeBase64Url } from './base64';
import type { HashAlgorithm, Key } from './cryptography';
import { importHmacKey, sign } from './cryptography';
import { encodeUtf8 } from './encoding';
import { binaryEquals } from './helpers';

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

  if (splits.length != 3) {
    throw new InvalidTokenError('invalid token format');
  }

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

export async function createJwtTokenString<THeader extends JwtTokenHeader, TPayload extends StringMap>(jwtToken: JwtToken<THeader, TPayload>, key: Key | string): Promise<string> {
  const headerBuffer = encodeUtf8(JSON.stringify(jwtToken.header));
  const payloadBuffer = encodeUtf8(JSON.stringify(jwtToken.payload));

  const encodedHeader = encodeBase64Url(headerBuffer, 0, headerBuffer.byteLength);
  const encodedPayload = encodeBase64Url(payloadBuffer, 0, payloadBuffer.byteLength);

  const headerPayloadDataString = `${encodedHeader}.${encodedPayload}`;
  const headerPayloadData = encodeUtf8(headerPayloadDataString);

  const signature = await getSignature(headerPayloadData, jwtToken.header.alg, key);
  const encodedSignature = encodeBase64Url(signature);

  const tokenString = `${headerPayloadDataString}.${encodedSignature}`;
  return tokenString;
}

export async function parseAndValidateJwtTokenString<THeader extends JwtTokenHeader = JwtTokenHeader, TPayload = StringMap>(tokenString: string, key: Key | string): Promise<JwtToken<THeader, TPayload>> {
  try {
    const { encoded, bytes, token } = parseJwtTokenString<THeader, TPayload>(tokenString);

    const calculatedSignature = await getSignature(encodeUtf8(`${encoded.header}.${encoded.payload}`), token.header.alg, key);
    const validSignature = binaryEquals(calculatedSignature, bytes.signature);

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

async function getSignature(data: BinaryData, algorithm: JwtTokenAlgorithm, key: Key | string): Promise<ArrayBuffer> {
  const hashAlgorithm = getHmacHashAlgorithm(algorithm);
  const hmacKey = await importHmacKey(hashAlgorithm, key, false);
  const hmacSignature = sign('HMAC', hmacKey, data);
  return hmacSignature.toBuffer();
}

function getHmacHashAlgorithm(algorithm: JwtTokenAlgorithm): HashAlgorithm {
  return algorithm.replace('HS', 'SHA-') as HashAlgorithm;
}
