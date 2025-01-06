import '#/polyfills.js';

import { openAsBlob } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { type FileMetadataResponse, FileState, GoogleAIFileManager } from '@google/generative-ai/server';

import { DetailsError } from '#/errors/details.error.js';
import { Singleton } from '#/injector/decorators.js';
import { injectArgument } from '#/injector/inject.js';
import { Resolvable, type resolveArgumentType } from '#/injector/interfaces.js';
import { convertToOpenApiSchema } from '#/schema/converters/openapi-converter.js';
import { array, enumeration, nullable, object, Schema, SchemaTestable, string } from '#/schema/index.js';
import { Enumeration as EnumerationType, EnumerationValue } from '#/types.js';
import { digest } from '#/utils/cryptography.js';
import { timeout } from '#/utils/timing.js';
import { tryIgnoreAsync } from '#/utils/try-ignore.js';
import { isBlob } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import { LiteralUnion } from 'type-fest';

export type FileInput = { path: string, mimeType: string } | Blob;

export type GenerativeAIModel = LiteralUnion<'gemini-2.0-flash-exp' | 'gemini-exp-1206' | 'gemini-2.0-flash-thinking-exp-1219', string>;

export type AiServiceOptions = {
  apiKey: string,
  model?: GenerativeAIModel
};

export type AiServiceArgument = AiServiceOptions;

@Singleton()
export class AiService implements Resolvable<AiServiceArgument> {
  readonly #options = injectArgument(this);
  readonly #fileCache = new Map<string, Promise<FileMetadataResponse>>();

  readonly genAI = new GoogleGenerativeAI(this.#options.apiKey);
  readonly fileManager = new GoogleAIFileManager(this.#options.apiKey);
  readonly model = this.genAI.getGenerativeModel({ model: this.#options.model ?? 'gemini-2.0-flash-exp' satisfies GenerativeAIModel });

  declare readonly [resolveArgumentType]: AiServiceArgument;

  async getFile(fileInput: FileInput): Promise<FileMetadataResponse> {
    const path = isBlob(fileInput) ? join(tmpdir(), crypto.randomUUID()) : fileInput.path;
    const mimeType = isBlob(fileInput) ? fileInput.type : fileInput.mimeType;
    const blob = isBlob(fileInput) ? fileInput : await openAsBlob(path, { type: mimeType });

    const buffer = await blob.arrayBuffer();
    const byteArray = new Uint8Array(buffer);

    const fileHash = await digest('SHA-256', byteArray).toBase64();
    const fileKey = `${fileHash}:${byteArray.length}`;

    if (this.#fileCache.has(fileKey)) {
      try {
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

        const result = await this.fileManager.uploadFile(path, { mimeType });
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

  async getFiles(files: FileInput[]): Promise<FileMetadataResponse[]> {
    return Promise.all(
      files.map(async (file) => this.getFile(file))
    );
  }

  async classify<T extends EnumerationType>(fileInput: FileInput, types: T): Promise<{ reasoning: string, types: { type: EnumerationValue<T>, confidence: 'high' | 'medium' | 'low' }[] | null }> {
    const file = await this.getFile(fileInput);

    const resultSchema = object({
      reasoning: string({ description: 'Reasoning for classification. Use to be more confident, if unsure. Reason for every somewhat likely document type.' }),
      types: nullable(array(
        object({
          type: enumeration(types, { description: 'Type of document' }),
          confidence: enumeration(['high', 'medium', 'low'], { description: 'How sure/certain you are about the classficiation.' })
        }),
        { description: 'One or more document types that matches' }
      ))
    });

    const responseSchema = convertToOpenApiSchema(resultSchema);

    const result = await this.model.generateContent({
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.5,
        responseMimeType: 'application/json',
        responseSchema
      },
      systemInstruction: 'You are a highly accurate document classification AI. Your task is to analyze the content of a given document and determine its type based on a predefined list of possible document types.',
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
            { text: `Classify the document. Output as JSON using the following schema:\n${JSON.stringify(responseSchema, null, 2)}\n\nIf none of the provided document types are a suitable match, return null for types.` }
          ]
        }
      ]
    });

    return resultSchema.parse(JSON.parse(result.response.text()));
  }

  async extractData<T>(fileInput: FileInput, schema: SchemaTestable<T>): Promise<T> {
    const file = await this.getFile(fileInput);

    const responseSchema = convertToOpenApiSchema(schema as SchemaTestable);

    const result = await this.model.generateContent({
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.5,
        responseMimeType: 'application/json',
        responseSchema
      },
      systemInstruction: `You are a highly skilled data extraction AI, specializing in accurately identifying and extracting information from unstructured text documents and converting it into a structured JSON format. Your primary goal is to meticulously follow the provided JSON schema and populate it with data extracted from the given document.

**Instructions:**
Carefully read and analyze the provided document. Identify relevant information that corresponds to each field in the JSON schema. Focus on accuracy and avoid making assumptions. If a field has multiple possible values, extract all relevant ones into the correct array structures ONLY IF the schema defines that field as an array; otherwise, extract only the single most relevant value.

**Reasoning**
Reason about every field in the json schema and find the best matching value. If there are multiple relevant values but the data type is not an array, reason about the values to find out which is the most relevant one.

You *MUST* output the reasoning first.`,
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
            { text: `Classify the document. Output as JSON using the following schema:\n${JSON.stringify(responseSchema, null, 2)}` }
          ]
        }
      ]
    });

    return Schema.parse(schema, JSON.parse(result.response.text()));
  }

  async waitForFileActive(fileMetadata: FileMetadataResponse): Promise<FileMetadataResponse> {
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

  async waitForFilesActive(...files: FileMetadataResponse[]): Promise<FileMetadataResponse[]> {
    const responses: FileMetadataResponse[] = [];

    for (const file of files) {
      const respones = await this.waitForFileActive(file);
      responses.push(respones);
    }

    return responses;
  }
}
