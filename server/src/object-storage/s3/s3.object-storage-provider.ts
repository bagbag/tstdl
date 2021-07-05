import type { ObjectStorageProvider } from '@tstdl/base/object-storage';
import { assert, assertStringPass, isString } from '@tstdl/base/utils';
import { Client } from 'minio';
import { S3ObjectStorage } from './s3.object-storage';

export const bucketPerModule: unique symbol = Symbol('bucket per module');

export class S3ObjectStorageProvider implements ObjectStorageProvider<S3ObjectStorage> {
  private readonly client: Client;
  private readonly bucket: string | true;

  /**
   * use a single bucket for all modules (which will become transparent key prefixes)
   * @param endpoint s3 endpoint
   * @param bucket bucket name
   * @param accessKey s3 access key
   * @param secretKey s3 secret key
   */
  constructor(endpoint: string, bucket: string, accessKey: string, secretKey: string);

  /**
   * use a own bucket for every module
   * @param endpoint s3 endpoint
   * @param bucketPerModule can only accept true
   * @param accessKey
   * @param secretKey
   */
  constructor(endpoint: string, bucketPerModule: true, accessKey: string, secretKey: string); // eslint-disable-line @typescript-eslint/unified-signatures

  constructor(endpoint: string, bucket: string | true, accessKey: string, secretKey: string) {
    const { hostname, port, protocol } = new URL(endpoint);

    assert(isString(bucket) || bucket == true, 'bucket/bucketPerModule must bei either a string or true');

    this.client = new Client({
      endPoint: hostname,
      port: (port.length > 0) ? parseInt(port, 10) : undefined,
      useSSL: protocol == 'https:',
      accessKey,
      secretKey
    });

    this.bucket = bucket;
  }

  get(module: string): S3ObjectStorage {
    const bucket = (this.bucket == true) ? module : assertStringPass(this.bucket);
    const prefix = (this.bucket == true) ? '' : ((module == '') ? '' : `${module}/`);

    return new S3ObjectStorage(this.client, bucket, module, prefix);
  }
}
