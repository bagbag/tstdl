import type { BinaryData, OneOrMany, Record } from '#/types/index.js';
import { InvalidTokenError } from '../errors/invalid-token.error.js';
import { toArray } from './array/array.js';
import { decodeBase64Url, encodeBase64Url } from './base64.js';
import type { HashAlgorithm, Key } from './cryptography.js';
import { importHmacKey, sign } from './cryptography.js';
import { encodeUtf8 } from './encoding.js';
import { timingSafeBinaryEquals } from './equals.js';

export type JwtTokenAlgorithm = 'HS256' | 'HS384' | 'HS512';

export type JwtTokenHeader<T extends Record<string> = Record<string>> = {
  alg: JwtTokenAlgorithm,
  typ: 'JWT',
} & T;

export type JwtToken<TPayload = Record<string>, THeader extends JwtTokenHeader = JwtTokenHeader> = {
  readonly header: THeader,
  readonly payload: TPayload,
};

export type JwtTokenParseResult<T extends JwtToken = JwtToken> = {
  raw: string,
  token: T,
  encoded: {
    header: string,
    payload: string,
    signature: string,
  },
  bytes: {
    header: Uint8Array<ArrayBuffer>,
    payload: Uint8Array<ArrayBuffer>,
    signature: Uint8Array<ArrayBuffer>,
  },
  string: {
    header: string,
    payload: string,
  },
};

export function parseJwtTokenString<T extends JwtToken = JwtToken>(tokenString: string): JwtTokenParseResult<T> {
  const splits = tokenString.split('.');

  if (splits.length != 3) {
    const message = (tokenString.length > 0) ? 'Invalid token format' : 'Missing authorization token';
    throw new InvalidTokenError(message);
  }

  const [encodedHeader, encodedPayload, encodedSignature] = splits;

  const textDecoder = new TextDecoder();

  const encoded: JwtTokenParseResult['encoded'] = {
    header: encodedHeader!,
    payload: encodedPayload!,
    signature: encodedSignature!,
  };

  const bytes: JwtTokenParseResult['bytes'] = {
    header: decodeBase64Url(encodedHeader!),
    payload: decodeBase64Url(encodedPayload!),
    signature: decodeBase64Url(encodedSignature!),
  };

  const string: JwtTokenParseResult['string'] = {
    header: textDecoder.decode(bytes.header),
    payload: textDecoder.decode(bytes.payload),
  };

  try {
    const header = JSON.parse(string.header) as T['header'];
    const payload = JSON.parse(string.payload) as T['payload'];

    const token: JwtToken = {
      header,
      payload,
    };

    return {
      raw: tokenString,
      token: token as T,
      encoded,
      bytes,
      string,
    };
  }
  catch {
    throw new InvalidTokenError('Invalid token format');
  }
}

export async function createJwtTokenString(jwtToken: JwtToken, key: Key | string): Promise<string> {
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

export async function parseAndValidateJwtTokenString<T extends JwtToken = JwtToken>(tokenString: string, allowedAlgorithms: OneOrMany<JwtTokenAlgorithm>, key: Key | string): Promise<T> {
  try {
    const { encoded, bytes, token } = parseJwtTokenString<T>(tokenString);

    if (!toArray(allowedAlgorithms).includes(token.header.alg)) {
      throw new InvalidTokenError('Invalid signature algorithm');
    }

    const calculatedSignature = await getSignature(encodeUtf8(`${encoded.header}.${encoded.payload}`), token.header.alg, key);
    const validSignature = timingSafeBinaryEquals(bytes.signature, calculatedSignature);

    if (!validSignature) {
      throw new InvalidTokenError('Invalid token signature');
    }

    return token;
  }
  catch (error: unknown) {
    if (error instanceof InvalidTokenError) {
      throw error;
    }

    throw new InvalidTokenError('Invalid token');
  }
}

async function getSignature(data: BinaryData<ArrayBuffer>, algorithm: JwtTokenAlgorithm, secret: Key | string): Promise<ArrayBuffer> {
  const hashAlgorithm = getHmacHashAlgorithm(algorithm);
  const hmacKey = await importHmacKey(hashAlgorithm, secret, false);
  const hmacSignature = sign('HMAC', hmacKey, data);

  return await hmacSignature.toBuffer();
}

function getHmacHashAlgorithm(algorithm: JwtTokenAlgorithm): HashAlgorithm {
  return algorithm.replace('HS', 'SHA-') as HashAlgorithm;
}
