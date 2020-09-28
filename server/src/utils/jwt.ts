import { UnauthorizedError } from '@tstdl/base/error';
import type { StringMap } from '@tstdl/base/types';
import { encodeBase64Url } from '@tstdl/base/utils';
import type { JwtToken, JwtTokenAlgorithm, JwtTokenHeader } from '@tstdl/base/utils/jwt';
import { parseJwtTokenString } from '@tstdl/base/utils/jwt';
import type { BinaryLike } from 'crypto';
import { createHmac } from 'crypto';

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
