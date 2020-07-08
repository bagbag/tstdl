import { StringMap } from '@tstdl/base/types';
import { decodeBase64Url, encodeBase64Url } from '@tstdl/base/utils';
import { BinaryLike, createHmac } from 'crypto';
import { UnauthorizedError } from '@tstdl/base/error';

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

export function createJwtTokenString({ header, payload }: JwtToken, secret: BinaryLike): string {
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
    const [encodedHeader, encodedPayload, encodedSignature] = tokenString.split('.');

    const headerString = Buffer.from(decodeBase64Url(encodedHeader)).toString('utf8');
    const payloadString = Buffer.from(decodeBase64Url(encodedPayload)).toString('utf8');

    const header = JSON.parse(headerString) as THeader;
    const payload = JSON.parse(payloadString) as TPayload;
    const signature = decodeBase64Url(encodedSignature);

    const calculatedSignature = getSignature(`${encodedHeader}.${encodedPayload}`, header.alg, secret);
    const validSignature = calculatedSignature.equals(Buffer.from(signature));

    if (!validSignature) {
      throw new UnauthorizedError('invalid token signature');
    }

    const token: JwtToken<THeader, TPayload> = {
      header,
      payload
    };

    return token;
  }
  catch (error) {
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
