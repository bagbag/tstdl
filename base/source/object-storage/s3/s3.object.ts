import type { ObjectMetadata } from '#/object-storage';
import { ObjectStorageObject } from '#/object-storage';
import { isUndefined } from '#/utils';
import type { BucketItemStat } from 'minio';
import type { S3ObjectStorage } from './s3.object-storage';


export class S3Object extends ObjectStorageObject {
  private readonly storage: S3ObjectStorage;
  private readonly resourceUri: string;

  private contentLength: number | undefined;
  private statPromise: Promise<BucketItemStat> | undefined;

  constructor(module: string, key: string, resourceUri: string, contentLength: number | undefined, storage: S3ObjectStorage) {
    super(module, key);

    this.resourceUri = resourceUri;
    this.contentLength = contentLength;
    this.storage = storage;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getResourceUri(): Promise<string> {
    return this.resourceUri;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getContentLength(): Promise<number> {
    if (isUndefined(this.contentLength)) {
      const stat = await this.stat();
      this.contentLength = stat.size;
    }


    return this.contentLength;
  }

  async getMetadata(): Promise<ObjectMetadata> {
    const stat = await this.stat();
    return stat.metaData;
  }

  async getContent(): Promise<Uint8Array> {
    return this.storage.getContent(this.key);
  }

  getContentStream(): ReadableStream<Uint8Array> {
    return this.storage.getContentStream(this.key);
  }

  private async stat(): Promise<BucketItemStat> {
    if (isUndefined(this.statPromise)) {
      this.statPromise = this.storage.statObject(this.key);
    }

    return this.statPromise;
  }
}
