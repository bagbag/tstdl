import { concatArrayBufferViews, decodeHex, encodeBase64Url, encodeUtf8, importHmacKey, isDefined, sign } from '#/utils';
import type { ImageFormat, ImageOptions, ImageOrigin, ImageService } from '../image-service';

export class ImgproxyImageService implements ImageService {
  private readonly endpoint: string;
  private readonly keyBytes: Uint8Array;
  private readonly saltBytes: Uint8Array;
  private readonly signatureSize: number;

  constructor(endpoint: string, key: string, salt: string, signatureSize: number) {
    this.endpoint = endpoint;
    this.signatureSize = signatureSize;
    this.keyBytes = decodeHex(key);
    this.saltBytes = decodeHex(salt);
  }

  async getUrl(resourceUri: string, options: ImageOptions = {}): Promise<string> {
    const encodedRessourceUri = encodeBase64Url(encodeUtf8(resourceUri));
    const processingOptions: string[] = [];

    const { resizeMode, width, height } = options;

    if (isDefined(width) || isDefined(height) || isDefined(resizeMode)) {
      processingOptions.push(`rs:${resizeMode ?? ''}:${width ?? ''}:${height ?? ''}`);
    }

    if (isDefined(options.origin)) {
      processingOptions.push(`gravity:${convertOrigin(options.origin)}`);
    }

    if (isDefined(options.quality)) {
      processingOptions.push(`q:${options.quality}`);
    }

    if (isDefined(options.cacheBuster)) {
      processingOptions.push(`cb:${options.cacheBuster}`);
    }

    if (isDefined(options.format)) {
      processingOptions.push(`f:${convertFormat(options.format)}`);
    }

    const processingOptionsString = processingOptions.join('/');
    const path = `/${[processingOptionsString, encodedRessourceUri].join('/')}`;

    const signature = await signString(this.keyBytes, this.saltBytes, path, this.signatureSize);
    return `${this.endpoint}/${signature}${path}`;
  }
}

async function signString(keyBytes: Uint8Array, saltBytes: Uint8Array, target: string, size: number = 32): Promise<string> {
  const hmacKey = await importHmacKey('SHA-256', keyBytes, false);
  const targetBytes = concatArrayBufferViews([saltBytes, encodeUtf8(target)]);

  const base64Signature = await sign('HMAC', hmacKey, targetBytes).toBuffer();
  return encodeBase64Url(base64Signature.slice(0, size));
}

function convertOrigin(origin: ImageOrigin): string {
  switch (origin) {
    case 'center': return 'ce';
    case 'smart': return 'sm';
    case 'top': return 'no';
    case 'left': return 'we';
    case 'right': return 'ea';
    case 'bottom': return 'so';
    case 'topleft': return 'nowe';
    case 'topright': return 'noea';
    case 'bottomleft': return 'sowe';
    case 'bottomright': return 'soea';

    default: throw new Error();
  }
}

function convertFormat(format: ImageFormat): string {
  switch (format) {
    case 'jpeg':
      return 'jpg';

    default:
      return format;
  }
}
