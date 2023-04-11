import type { Injectable } from '#/container/index.js';
import { container, injectArg, injectionToken, singleton, type resolveArgumentType } from '#/container/index.js';
import { encodeBase64Url } from '#/utils/base64.js';
import { concatArrayBufferViews } from '#/utils/binary.js';
import { importHmacKey, sign } from '#/utils/cryptography.js';
import { decodeHex, encodeUtf8 } from '#/utils/encoding.js';
import { isDefined } from '#/utils/type-guards.js';
import type { ImageOptions, ImageOrigin } from '../image-service.js';
import { ImageService } from '../image-service.js';

export type ImgproxyImageServiceConfig = {
  endpoint: string,
  key: string,
  salt: string,
  signatureSize: number
};

export const IMGPROXY_IMAGE_SERVICE_CONFIG = injectionToken<ImgproxyImageServiceConfig>('ImgproxyImageServiceConfig');

@singleton<ImgproxyImageService, ImgproxyImageServiceConfig>({
  defaultArgumentProvider: (context) => context.resolve(IMGPROXY_IMAGE_SERVICE_CONFIG)
})
export class ImgproxyImageService extends ImageService implements Injectable<ImgproxyImageServiceConfig> {
  private readonly endpoint: string;
  private readonly keyBytes: Uint8Array;
  private readonly saltBytes: Uint8Array;
  private readonly signatureSize: number;

  declare readonly [resolveArgumentType]: ImgproxyImageServiceConfig;
  constructor(
    @injectArg<ImgproxyImageServiceConfig>('endpoint') endpoint: string,
    @injectArg<ImgproxyImageServiceConfig>('key') key: string,
    @injectArg<ImgproxyImageServiceConfig>('salt') salt: string,
    @injectArg<ImgproxyImageServiceConfig>('signatureSize') signatureSize: number
  ) {
    super();

    this.endpoint = endpoint;
    this.signatureSize = signatureSize;
    this.keyBytes = decodeHex(key);
    this.saltBytes = decodeHex(salt);
  }

  async getUrl(resourceUri: string, options: ImageOptions = {}): Promise<string> {
    const encodedResourceUri = encodeBase64Url(encodeUtf8(resourceUri));
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
      processingOptions.push(`f:${options.format}`);
    }

    const processingOptionsString = processingOptions.join('/');
    const path = `/${[processingOptionsString, encodedResourceUri].join('/')}`;

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

/**
 * configure imgproxy image service module
 * @param defaultConfig default configuration
 * @param register whether to register for {@link ImageService}
 */
export function configureImgproxyImageService(defaultConfig: ImgproxyImageServiceConfig, register: boolean = true): void {
  container.register(IMGPROXY_IMAGE_SERVICE_CONFIG, { useValue: defaultConfig });

  if (register) {
    container.registerSingleton(ImageService, { useToken: ImgproxyImageService });
  }
}
