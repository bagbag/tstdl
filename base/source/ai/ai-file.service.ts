import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';

import { Storage, type Bucket } from '@google-cloud/storage';
import { FileState, GoogleGenAI } from '@google/genai';

import { CancellationSignal } from '#/cancellation/token.js';
import { AsyncEnumerable } from '#/enumerable/async-enumerable.js';
import { DetailsError } from '#/errors/details.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { createArray } from '#/utils/array/array.js';
import { backoffGenerator, type BackoffGeneratorOptions } from '#/utils/backoff.js';
import { formatBytes } from '#/utils/format.js';
import { readBinaryStream } from '#/utils/stream/stream-reader.js';
import { assertDefinedPass, isBlob, isDefined, isUndefined } from '#/utils/type-guards.js';
import type { AiServiceOptions } from './ai.service.js';
import { isPathFileInput, type FileContentPart, type FileInput } from './types.js';

/**
 * Options for {@link AiFileService}.
 */
export type AiFileServiceOptions = Pick<AiServiceOptions, 'apiKey' | 'keyFile' | 'vertex'>;

export type AiFileServiceArgument = AiFileServiceOptions;

type File = {
  id: string,
  name: string,
  uri: string,
  mimeType: string,
};

/**
 * Manages file uploads and state for use with AI models.
 * Handles both Google Generative AI File API and Google Cloud Storage for Vertex AI.
 */
@Singleton()
export class AiFileService implements Resolvable<AiFileServiceArgument> {
  readonly #options = injectArgument(this);

  readonly #genAI = new GoogleGenAI({
    vertexai: isDefined(this.#options.vertex?.project),
    project: this.#options.vertex?.project,
    location: this.#options.vertex?.location,
    googleAuthOptions: isDefined(this.#options.vertex?.project) ? { apiKey: this.#options.apiKey, keyFile: this.#options.keyFile } : undefined,
    apiKey: isUndefined(this.#options.vertex?.project) ? assertDefinedPass(this.#options.apiKey, 'Api key not defined') : undefined,
  });

  readonly #storage = isDefined(this.#options.vertex) ? new Storage({ keyFile: assertDefinedPass(this.#options.keyFile, 'Key file not defined'), projectId: this.#options.vertex.project }) : undefined;
  readonly #fileMap = new Map<string, File>();
  readonly #fileUriMap = new Map<string, File>();
  readonly #logger = inject(Logger, 'AiFileService');
  readonly #cancellationSignal = inject(CancellationSignal);

  readonly #backoffOptions: BackoffGeneratorOptions = {
    cancellationSignal: this.#cancellationSignal,
    strategy: 'linear',
    initialDelay: 1000,
    increase: 500,
    jitter: 0.2,
    maximumDelay: 10000,
  };

  #bucket: Bucket | undefined;

  declare readonly [resolveArgumentType]: AiFileServiceArgument;

  /**
   * Uploads and processes a single file, making it available for AI model consumption.
   * @param fileInput The file to process.
   * @returns A promise that resolves to a {@link FileContentPart} for use in AI requests.
   */
  async processFile(fileInput: FileInput): Promise<FileContentPart> {
    const file = await this.getFile(fileInput);

    this.#fileMap.set(file.id, file);
    this.#fileUriMap.set(file.uri, file);

    return { file: file.id };
  }

  /**
   * Uploads and processes multiple files in parallel, making them available for AI model consumption.
   * @param fileInputs The files to process.
   * @returns A promise that resolves to an array of {@link FileContentPart} for use in AI requests.
   */
  async processFiles(fileInputs: FileInput[]): Promise<FileContentPart[]> {
    const files = await this.getFiles(fileInputs);

    return files.map((file) => {
      this.#fileMap.set(file.id, file);
      this.#fileUriMap.set(file.uri, file);

      return { file: file.id };
    });
  }

  /**
   * Retrieves a file by its internal ID.
   * The file must have been processed by this service instance before.
   * @param id The internal ID of the file.
   * @returns The file, or `undefined` if not found.
   */
  getFileById(id: string): File | undefined {
    return this.#fileMap.get(id);
  }

  /**
   * Retrieves a file by its URI (e.g., GCS URI).
   * The file must have been processed by this service instance before.
   * @param uri The URI of the file.
   * @returns The file, or `undefined` if not found.
   */
  getFileByUri(uri: string): File | undefined {
    return this.#fileUriMap.get(uri);
  }

  private async getFile(fileInput: FileInput): Promise<File> {
    const id = crypto.randomUUID();

    const file = await this.uploadFile(fileInput, id);

    this.#logger.verbose(`Processing file "${id}"...`);
    await this.waitForFileActive(file);

    return file;
  }

  private async getFiles(fileInputs: readonly FileInput[]): Promise<File[]> {
    const ids = createArray(fileInputs.length, () => crypto.randomUUID());

    const files = await AsyncEnumerable.from(fileInputs).parallelMap(5, true, async (file, index) => await this.uploadFile(file, ids[index]!)).toArray();

    this.#logger.verbose(`Processing ${fileInputs.length} files...`);
    await this.waitForFilesActive(files);

    return files;
  }

  private async uploadFile(fileInput: FileInput, id: string): Promise<File> {
    if (isDefined(this.#storage)) {
      return await this.uploadFileVertex(fileInput, id);
    }

    return await this.uploadFileGenAi(fileInput, id);
  }

  private async uploadFileVertex(fileInput: FileInput, id: string): Promise<File> {
    const bucket = await this.getBucket();
    const file = bucket.file(id);

    let stream: Readable;
    let contentType: string | undefined;
    let size: number | undefined;

    if (isBlob(fileInput)) {
      stream = Readable.fromWeb(fileInput.stream() as NodeReadableStream);
      contentType = fileInput.type;
      size = fileInput.size;
    }
    else if (isPathFileInput(fileInput)) {
      const stats = await stat(fileInput.path);
      stream = createReadStream(fileInput.path);
      contentType = fileInput.mimeType;
      size = stats.size;
    }
    else {
      stream = Readable.fromWeb(fileInput.stream as NodeReadableStream);
      contentType = fileInput.mimeType;
      size = fileInput.size;
    }

    this.#logger.verbose(`Uploading file "${id}"${isDefined(size) ? ` (${formatBytes(size)})` : ''}...`);

    await file.save(stream, { contentType, resumable: false });

    return {
      id,
      name: id,
      uri: `gs://${bucket.name}/${file.name}`,
      mimeType: contentType,
    };
  }

  private async uploadFileGenAi(fileInput: FileInput, id: string): Promise<File> {
    let uploadData: Blob | string;
    let contentType: string | undefined;
    let size: number;

    if (isBlob(fileInput)) {
      uploadData = fileInput;
      contentType = fileInput.type;
      size = fileInput.size;
    }
    else if (isPathFileInput(fileInput)) {
      const fileState = await stat(fileInput.path);

      uploadData = fileInput.path;
      contentType = fileInput.mimeType;
      size = fileState.size;
    }
    else {
      const fileBytes = await readBinaryStream(fileInput.stream);
      const blob = new Blob([fileBytes], { type: fileInput.mimeType });

      uploadData = blob;
      contentType = blob.type;
      size = blob.size;
    }

    this.#logger.verbose(`Uploading file "${id}" (${formatBytes(size)})...`);

    // upload supports paths and blobs, but not streams (yet)
    const response = await this.#genAI.files.upload({ file: uploadData, config: { mimeType: contentType } });

    return {
      id,
      name: assertDefinedPass(response.name, 'Missing file name'),
      uri: assertDefinedPass(response.uri, 'Missing file uri'),
      mimeType: assertDefinedPass(response.mimeType, 'Missing file mime type'),
    };
  }

  private async getBucket(): Promise<Bucket> {
    if (isUndefined(this.#options.vertex)) {
      throw new Error('Not using Vertex');
    }

    if (isDefined(this.#bucket)) {
      return this.#bucket;
    }

    const bucketName = assertDefinedPass(this.#options.vertex.bucket, 'Bucket not specified');
    const bucket = this.#storage!.bucket(bucketName);
    const [exists] = await bucket.exists();

    if (!exists) {
      this.#logger.info(`Bucket "${bucketName}" not found, creating...`);

      const [createdBucket] = await this.#storage!.createBucket(bucketName, {
        location: this.#options.vertex.location,
        lifecycle: {
          rule: [{
            action: { type: 'Delete' },
            condition: { age: 1 },
          }],
        },
      });

      this.#bucket = createdBucket;
    }
    else {
      this.#bucket = bucket;
    }

    return this.#bucket;
  }

  private async waitForFileActive(file: File): Promise<void> {
    if (isDefined(this.#options.vertex)) {
      // For Vertex, uploads to GCS are instantly "active"
      return;
    }

    for await (const backoff of backoffGenerator(this.#backoffOptions)) {
      const state = await this.#genAI.files.get({ name: file.name });

      if (state.state == FileState.ACTIVE) {
        this.#logger.verbose(`File "${file.id}" is active.`);
        return;
      }

      if (state.state == FileState.FAILED) {
        throw new DetailsError(state.error?.message ?? `Failed to process file ${state.name}`, state.error?.details);
      }

      backoff();
    }
  }

  private async waitForFilesActive(files: File[]): Promise<void> {
    // parallelizing does not help here, as each file upload is independently processed in the background
    for (const file of files) {
      await this.waitForFileActive(file);
    }
  }
}
