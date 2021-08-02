import type { ObjectStorageProvider } from '#/object-storage';
import { assertDefinedPass, assertStringPass, isDefined } from '#/utils';
import { Client } from 'minio';
import { S3ObjectStorage } from './s3.object-storage';

export type S3ObjectStorageProviderConfig = {
  /**
   * s3 endpoint
   */
  endpoint: string,

  /**
   * s3 bucket, use a single bucket for all modules (which will become transparent key prefixes)
   *
   * mutually exclusive with bucketPerModule
   */
  bucket?: string,

  /**
   * use an own bucket for every module
   *
   * mutually exclusive with bucket
   */
  bucketPerModule?: boolean,

  /**
   * s3 access key
   */
  accessKey: string,

  /**
   * s3 secret key
   */
  secretKey: string
};

export const bucketPerModule: unique symbol = Symbol('bucket per module');

export class S3ObjectStorageProvider implements ObjectStorageProvider<S3ObjectStorage> {
  private readonly client: Client;
  private readonly bucket: string | true;

  constructor(config: S3ObjectStorageProviderConfig) {
    const { hostname, port, protocol } = new URL(config.endpoint);

    if (isDefined(config.bucket) && (config.bucketPerModule == true)) {
      throw new Error('bucket and bucketPerModule is mutually exclusive');
    }

    this.client = new Client({
      endPoint: hostname,
      port: (port.length > 0) ? parseInt(port, 10) : undefined,
      useSSL: protocol == 'https:',
      accessKey: config.accessKey,
      secretKey: config.secretKey
    });

    this.bucket = assertDefinedPass((config.bucketPerModule == true) ? true : config.bucket, 'either bucket or bucketPerModule must be specified');
  }

  get(module: string): S3ObjectStorage {
    const bucket = (this.bucket == true) ? module : assertStringPass(this.bucket);
    const prefix = (this.bucket == true) ? '' : ((module == '') ? '' : `${module}/`);

    return new S3ObjectStorage(this.client, bucket, module, prefix);
  }
}
