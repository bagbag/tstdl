import { Singleton } from '#/injector/decorators.js';
import { Injector } from '#/injector/injector.js';
import { ObjectStorage, ObjectStorageProvider } from '#/object-storage/index.js';
import { assertDefinedPass, assertStringPass, isDefined } from '#/utils/type-guards.js';
import { Client } from 'minio';
import { S3ObjectStorage } from './s3.object-storage.js';

export class S3ObjectStorageProviderConfig {
  /**
   * S3 endpoint
   */
  endpoint: string;

  /**
   * S3 bucket, use a single bucket for all modules (which will become transparent key prefixes)
   *
   * mutually exclusive with bucketPerModule
   */
  bucket?: string;

  /**
   * Use an own bucket for every module
   *
   * mutually exclusive with bucket
   */
  bucketPerModule?: boolean;

  /**
   * S3 access key
   */
  accessKey: string;

  /**
   * S3 secret key
   */
  secretKey: string;
}

export const bucketPerModule: unique symbol = Symbol('bucket per module');

@Singleton()
export class S3ObjectStorageProvider extends ObjectStorageProvider<S3ObjectStorage> {
  private readonly client: Client;
  private readonly bucket: string | true;

  constructor(config: S3ObjectStorageProviderConfig) {
    super();

    const { hostname, port, protocol } = new URL(config.endpoint);

    if (isDefined(config.bucket) && (config.bucketPerModule == true)) {
      throw new Error('bucket and bucketPerModule is mutually exclusive');
    }

    this.client = new Client({
      endPoint: hostname,
      port: (port.length > 0) ? parseInt(port, 10) : undefined,
      useSSL: protocol == 'https:',
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });

    this.bucket = assertDefinedPass((config.bucketPerModule == true) ? true : config.bucket, 'either bucket or bucketPerModule must be specified');
  }

  get(module: string): S3ObjectStorage {
    const bucket = (this.bucket == true) ? module : assertStringPass(this.bucket);
    const prefix = (this.bucket == true) ? '' : ((module == '') ? '' : `${module}/`);

    return new S3ObjectStorage(this.client, bucket, module, prefix);
  }
}

/**
 * Configure s3 object storage provider
 * @param config s3 config
 * @param register whether to register for {@link ObjectStorage} and {@link ObjectStorageProvider}
 */
export function configureS3ObjectStorage(config: S3ObjectStorageProviderConfig, register: boolean = true): void {
  Injector.register(S3ObjectStorageProviderConfig, { useValue: config });

  if (register) {
    Injector.registerSingleton(ObjectStorageProvider, { useToken: S3ObjectStorageProvider });
    Injector.registerSingleton(ObjectStorage, { useToken: S3ObjectStorage });
  }
}
