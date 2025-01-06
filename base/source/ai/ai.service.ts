import '#/polyfills.js';

import { openAsBlob } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { type FileMetadataResponse, FileState, GoogleAIFileManager } from '@google/generative-ai/server';
import { LiteralUnion } from 'type-fest';

import { DetailsError } from '#/errors/details.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import { Resolvable, type resolveArgumentType } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { convertToOpenApiSchema } from '#/schema/converters/openapi-converter.js';
import { array, enumeration, nullable, object, OneOrMany, Schema, SchemaTestable } from '#/schema/index.js';
import { Enumeration as EnumerationType, EnumerationValue } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { digest } from '#/utils/cryptography.js';
import { formatBytes } from '#/utils/format.js';
import { timeout } from '#/utils/timing.js';
import { tryIgnoreAsync } from '#/utils/try-ignore.js';
import { isBlob } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';

export type FileInput = { path: string, mimeType: string } | Blob;

export type GenerativeAIModel = LiteralUnion<'gemini-2.0-flash-exp' | 'gemini-exp-1206' | 'gemini-2.0-flash-thinking-exp-1219', string>;

export type GenerationOptions = {
  model?: GenerativeAIModel,
  maxOutputTokens?: number,
  temperature?: number,
  topP?: number,
  topK?: number,
  presencePenalty?: number,
  frequencyPenalty?: number
};

export type GenerationResult<T> = {
  result: T,
  usage?: {
    promptTokenCount: number,
    candidatesTokenCount: number,
    totalTokenCount: number
  }
};

export type AiServiceOptions = {
  apiKey: string,
  defaultModel?: GenerativeAIModel
};

export type AiServiceArgument = AiServiceOptions;

@Singleton()
export class AiService implements Resolvable<AiServiceArgument> {
  readonly #options = injectArgument(this);
  readonly #fileCache = new Map<string, Promise<FileMetadataResponse>>();
  readonly #logger = inject(Logger, 'AiService');

  readonly genAI = new GoogleGenerativeAI(this.#options.apiKey);
  readonly fileManager = new GoogleAIFileManager(this.#options.apiKey);
  readonly defaultModel = this.#options.defaultModel ?? 'gemini-2.0-flash-exp' satisfies GenerativeAIModel;

  declare readonly [resolveArgumentType]: AiServiceArgument;

  async getFile(fileInput: FileInput): Promise<FileMetadataResponse> {
    const path = isBlob(fileInput) ? join(tmpdir(), crypto.randomUUID()) : fileInput.path;
    const mimeType = isBlob(fileInput) ? fileInput.type : fileInput.mimeType;
    const blob = isBlob(fileInput) ? fileInput : await openAsBlob(path, { type: mimeType });

    const buffer = await blob.arrayBuffer();
    const byteArray = new Uint8Array(buffer);

    const fileHash = await digest('SHA-1', byteArray).toBase64();
    const fileKey = `${fileHash}:${byteArray.length}`;

    if (this.#fileCache.has(fileKey)) {
      try {
        this.#logger.verbose(`Fetching file "${fileHash}" from cache...`);
        const cachedFile = await this.#fileCache.get(fileKey)!;
        return await this.fileManager.getFile(cachedFile.name);
      }
      catch {
        this.#fileCache.delete(fileKey);
      }
    }

    const filePromise = (async () => {
      try {
        await using stack = new AsyncDisposableStack();

        if (isBlob(fileInput)) {
          stack.defer(async () => tryIgnoreAsync(async () => unlink(path)));
          await writeFile(path, byteArray);
        }

        this.#logger.verbose(`Uploading file "${fileHash}" (${formatBytes(byteArray.length)})...`);
        const result = await this.fileManager.uploadFile(path, { mimeType });

        this.#logger.verbose(`Processing file "${fileHash}"...`);
        return await this.waitForFileActive(result.file);
      }
      catch (error) {
        this.#fileCache.delete(fileKey);
        throw error;
      }
    })();

    this.#fileCache.set(fileKey, filePromise);

    return filePromise;
  }

  async getFiles(files: readonly FileInput[]): Promise<FileMetadataResponse[]> {
    return Promise.all(
      files.map(async (file) => this.getFile(file))
    );
  }

  async classify<T extends EnumerationType>(fileInput: OneOrMany<FileInput>, types: T, options?: GenerationOptions): Promise<GenerationResult<{ types: { type: EnumerationValue<T>, confidence: 'high' | 'medium' | 'low' }[] | null }>> {
    const files = await this.getFiles(toArray(fileInput));

    const resultSchema = object({
      types: nullable(array(
        object({
          type: enumeration(types, { description: 'Type of document' }),
          confidence: enumeration(['high', 'medium', 'low'], { description: 'How sure/certain you are about the classficiation.' })
        }),
        { description: 'One or more document types that matches' }
      ))
    });

    const responseSchema = convertToOpenApiSchema(resultSchema);

    this.#logger.verbose('Classifying...');
    const result = await this.getModel(options?.model ?? this.defaultModel).generateContent({
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.75,
        ...options,
        responseMimeType: 'application/json',
        responseSchema
      },
      systemInstruction: 'You are a highly accurate document classification AI. Your task is to analyze the content of a given document and determine its type based on a predefined list of possible document types.',
      contents: [
        {
          role: 'user',
          parts: [
            ...files.map((file) => ({ fileData: { mimeType: file.mimeType, fileUri: file.uri } })),
            { text: `Classify the document. Output as JSON using the following schema:\n${JSON.stringify(responseSchema, null, 2)}\n\nIf none of the provided document types are a suitable match, return null for types.` }
          ]
        }
      ]
    });

    return {
      usage: result.response.usageMetadata,
      result: resultSchema.parse(JSON.parse(result.response.text()))
    };
  }

  async extractData<T>(fileInput: OneOrMany<FileInput>, schema: SchemaTestable<T>, options?: GenerationOptions): Promise<GenerationResult<T>> {
    const files = await this.getFiles(toArray(fileInput));
    const responseSchema = convertToOpenApiSchema(schema as SchemaTestable);

    this.#logger.verbose('Extracting data...');
    const result = await this.getModel(options?.model ?? this.defaultModel).generateContent({
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.5,
        responseMimeType: 'application/json',
        responseSchema
      },
      systemInstruction: `You are a highly skilled data extraction AI, specializing in accurately identifying and extracting information from unstructured text documents and converting it into a structured JSON format. Your primary goal is to meticulously follow the provided JSON schema and populate it with data extracted from the given document.

**Instructions:**
Carefully read and analyze the provided document. Identify relevant information that corresponds to each field in the JSON schema. Focus on accuracy and avoid making assumptions. If a field has multiple possible values, extract all relevant ones into the correct array structures ONLY IF the schema defines that field as an array; otherwise, extract only the single most relevant value.`,
      contents: [
        {
          role: 'user',
          parts: [
            ...files.map((file) => ({ fileData: { mimeType: file.mimeType, fileUri: file.uri } })),
            { text: `Classify the document. Output as JSON using the following schema:\n${JSON.stringify(responseSchema, null, 2)}` }
          ]
        }
      ]
    });

    return {
      usage: result.response.usageMetadata,
      result: Schema.parse(schema, JSON.parse(result.response.text()))
    };
  }

  private async waitForFileActive(fileMetadata: FileMetadataResponse): Promise<FileMetadataResponse> {
    let file = await this.fileManager.getFile(fileMetadata.name);

    while (file.state == FileState.PROCESSING) {
      await timeout(millisecondsPerSecond);
      file = await this.fileManager.getFile(fileMetadata.name);
    }

    if (file.state == FileState.FAILED) {
      throw new DetailsError(file.error?.message ?? `Failed to process file ${file.name}`, file.error?.details);
    }

    return file;
  }

  private async waitForFilesActive(...files: FileMetadataResponse[]): Promise<FileMetadataResponse[]> {
    const responses: FileMetadataResponse[] = [];

    for (const file of files) {
      const respones = await this.waitForFileActive(file);
      responses.push(respones);
    }

    return responses;
  }

  private getModel(model: GenerativeAIModel) {
    return this.genAI.getGenerativeModel({ model });
  }
}
