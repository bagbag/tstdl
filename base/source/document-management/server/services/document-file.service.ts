import sharp, { type SharpInput } from 'sharp';
import { match } from 'ts-pattern';

import { AiService } from '#/ai/ai.service.js';
import type { FileContentPart } from '#/ai/types.js';
import { ForbiddenError } from '#/errors/forbidden.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
import { getMimeType, getMimeTypeExtensions, mimeTypes } from '#/file/index.js';
import { TemporaryFile } from '#/file/server/index.js';
import { inject } from '#/injector/inject.js';
import { Logger } from '#/logger/logger.js';
import { ObjectStorage } from '#/object-storage/index.js';
import { Transactional } from '#/orm/server/index.js';
import { pdfToImage } from '#/pdf/index.js';
import { Alphabet } from '#/utils/alphabet.js';
import { digest } from '#/utils/cryptography.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { getRandomString } from '#/utils/random.js';
import { readableStreamFromPromise, readBinaryStream } from '#/utils/stream/index.js';
import { isDefined, isNotReadableStream, isNotUint8Array, isUint8Array } from '#/utils/type-guards.js';
import { millisecondsPerMinute, secondsPerMinute } from '#/utils/units.js';
import { Document } from '../../models/index.js';
import { DocumentManagementConfiguration } from '../module.js';
import { DocumentManagementSingleton } from './singleton.js';

export type DocumentFileMetadata = {
  mimeType: string,
  size: number,
  hash: string,
};

@DocumentManagementSingleton()
export class DocumentFileService extends Transactional {
  readonly #configuration = inject(DocumentManagementConfiguration);

  readonly #aiService = inject(AiService);
  readonly #fileObjectStorage = inject(ObjectStorage, this.#configuration.fileObjectStorageModule);
  readonly #filePreviewObjectStorage = inject(ObjectStorage, this.#configuration.filePreviewObjectStorageModule);
  readonly #fileUploadObjectStorage = inject(ObjectStorage, { module: this.#configuration.fileUploadObjectStorageModule, configuration: { lifecycle: { expiration: { after: 5 * secondsPerMinute } } } });
  readonly #logger = inject(Logger, DocumentFileService.name);

  readonly #aiFilePartCache = new Map<string, { part: FileContentPart, timestamp: number }>();

  /**
   * Initiates a file upload
   * @param key - key which can be used to authorize the creation of the file. Same key must be provided to {@link store} method, or it will throw an error.
   * The key could be the user id from the request token. This ensures that the file can only be created by the user who initiated the upload.
   * @returns upload information
   */
  async initiateUpload({ key, contentLength }: { key: string, contentLength: number }): Promise<{ uploadId: string, uploadUrl: string }> {
    if (contentLength > (this.#configuration.maxFileSize ?? Number.POSITIVE_INFINITY)) {
      throw new ForbiddenError(`Content length exceeds the maximum limit of ${this.#configuration.maxFileSize} bytes.`);
    }

    const id = getRandomString(64, Alphabet.LowerUpperCaseNumbers);
    const url = await this.#fileUploadObjectStorage.getUploadUrl(id, currentTimestamp() + (5 * millisecondsPerMinute), { contentLength, metadata: { 'upload-key': key } });

    return { uploadId: id, uploadUrl: url };
  }

  async store(documentId: string, content: Uint8Array<ArrayBuffer> | ReadableStream<Uint8Array<ArrayBuffer>>): Promise<DocumentFileMetadata>;
  async store(documentId: string, content: { uploadId: string, uploadKey: string }): Promise<[DocumentFileMetadata, Uint8Array<ArrayBuffer>]>;
  async store(documentId: string, content: Uint8Array<ArrayBuffer> | ReadableStream<Uint8Array<ArrayBuffer>> | { uploadId: string, uploadKey: string }): Promise<DocumentFileMetadata | [DocumentFileMetadata, Uint8Array<ArrayBuffer>]> {
    const isUpload = isNotUint8Array(content) && isNotReadableStream(content);

    if (isUpload) {
      const object = await this.#fileUploadObjectStorage.getObject(content.uploadId);
      const objectMetadata = await object.getMetadata();
      const objectContentLength = await object.getContentLength();

      if (content.uploadKey != objectMetadata['upload-key']) {
        throw new ForbiddenError(`Invalid upload key`);
      }

      if (objectContentLength > (this.#configuration.maxFileSize ?? Number.POSITIVE_INFINITY)) {
        await this.#fileUploadObjectStorage.deleteObject(object.key);
        throw new ForbiddenError(`Content length exceeds the maximum limit of ${this.#configuration.maxFileSize} bytes.`);
      }
    }

    const contentAsUint8Array = isUpload
      ? await this.#fileUploadObjectStorage.getContent(content.uploadId)
      : (isUint8Array(content) ? content : await readBinaryStream(content));

    const hash = await digest('SHA-256', contentAsUint8Array).toHex();
    const mimeType = await getMimeType(contentAsUint8Array, 'application/octet-stream' satisfies keyof typeof mimeTypes);

    const metadata: DocumentFileMetadata = {
      mimeType,
      size: contentAsUint8Array.length,
      hash,
    };

    const objectKey = getObjectKey(documentId);

    if (isUpload) {
      await this.#fileUploadObjectStorage.moveObject(content.uploadId, [this.#fileObjectStorage, objectKey]);
      return [metadata, contentAsUint8Array];
    }

    await this.#fileObjectStorage.uploadObject(objectKey, contentAsUint8Array, { contentLength: contentAsUint8Array.length, contentType: mimeType });

    return metadata;
  }

  async getContent(document: Document): Promise<Uint8Array> {
    const objectKey = getObjectKey(document.id);
    return await this.#fileObjectStorage.getContent(objectKey);
  }

  getContentStream(document: Document): ReadableStream<Uint8Array> {
    const objectKey = getObjectKey(document.id);
    return this.#fileObjectStorage.getContentStream(objectKey);
  }

  async getContentUrl(document: Document, download: boolean = false): Promise<string> {
    return await this.getDocumentFileContentObjectUrl(document, document.title ?? document.id, download);
  }

  async getPreview(document: Document, page: number = 1): Promise<Uint8Array> {
    const objectKey = getObjectKey(document.id);
    await this.createPreviewIfNotExists(document, page);

    return await this.#filePreviewObjectStorage.getContent(objectKey);
  }

  getPreviewStream(document: Document, page: number = 1): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const objectKey = getObjectKey(document.id);
      await this.createPreviewIfNotExists(document, page);

      return this.#filePreviewObjectStorage.getContentStream(objectKey);
    });
  }

  async getPreviewUrl(document: Document, page: number = 1): Promise<string> {
    const objectKey = getObjectKey(document.id);
    await this.createPreviewIfNotExists(document, page);

    return await this.#filePreviewObjectStorage.getDownloadUrl(objectKey, currentTimestamp() + (5 * millisecondsPerMinute), {
      'Response-Content-Type': 'image/jpeg',
    });
  }

  async getAiFileContentPart(document: Document): Promise<FileContentPart> {
    const cachedAiFilePart = this.#aiFilePartCache.get(document.id);

    if (isDefined(cachedAiFilePart)) {
      if (cachedAiFilePart.timestamp > (currentTimestamp() - (5 * millisecondsPerMinute))) {
        return cachedAiFilePart.part;
      }

      this.#aiFilePartCache.delete(document.id);
    }

    const fileContentStream = this.getContentStream(document);
    await using tmpFile = await TemporaryFile.from(fileContentStream);
    const filePart = await this.#aiService.processFile({ path: tmpFile.path, mimeType: document.mimeType });

    this.#aiFilePartCache.set(document.id, { part: filePart, timestamp: currentTimestamp() });

    return filePart;
  }

  private async createPreviewIfNotExists(document: Document, page: number = 1): Promise<void> {
    const key = getObjectKey(document.id);
    const hasPreview = await this.#filePreviewObjectStorage.exists(key);

    if (!hasPreview) {
      const content = await this.#fileObjectStorage.getContent(key);

      const image = await match(document.mimeType)
        .with('application/pdf', async () => {
          const imageBytes = await pdfToImage(content, page, 768, 'jpeg');
          return await imageToPreview(imageBytes);
        })
        .with('image/*', async () => await imageToPreview(content))
        .otherwise(() => { throw new NotImplementedError('Preview generation is not implemented for this file type.'); });

      await this.#filePreviewObjectStorage.uploadObject(key, image, { contentLength: image.length, contentType: 'image/jpeg' });
    }
  }

  private async getDocumentFileContentObjectUrl(document: Document, title: string, download: boolean): Promise<string> {
    const key = getObjectKey(document.id);
    const fileExtension = getMimeTypeExtensions(document.mimeType)[0] ?? 'bin';
    const disposition = download ? 'attachment' : 'inline';
    const filename = `${title}.${fileExtension}`;

    return await this.#fileObjectStorage.getDownloadUrl(key, currentTimestamp() + (5 * millisecondsPerMinute), {
      'Response-Content-Type': document.mimeType,
      'Response-Content-Disposition': `${disposition}; filename = "${encodeURIComponent(filename)}"`,
    });
  }
}

function getObjectKey(documentId: string): string {
  return `${documentId.slice(0, 2)}/${documentId.slice(0, 4)}/${documentId}`;
}

async function imageToPreview(input: SharpInput): Promise<Uint8Array> {
  return await sharp(input)
    .resize({
      width: 768,
      height: 768,
      fit: 'cover',
      position: 'top',
      withoutEnlargement: true,
      fastShrinkOnLoad: false,
    })
    .toFormat('jpeg', { quality: 75 })
    .toBuffer();
}
