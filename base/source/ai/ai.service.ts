import { FinishReason, type FunctionDeclaration, type FunctionDeclarationSchema, type GenerateContentCandidate, type GenerationConfig, type Content as GoogleContent, FunctionCallingMode as GoogleFunctionCallingMode, type Part, type StreamGenerateContentResult, type UsageMetadata, VertexAI } from '@google-cloud/vertexai';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { NotSupportedError } from '#/errors/not-supported.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { getShutdownSignal } from '#/process-shutdown.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import { LazyPromise } from '#/promise/lazy-promise.js';
import { convertToOpenApiSchema } from '#/schema/converters/openapi-converter.js';
import { array, enumeration, nullable, object, type OneOrMany, Schema, type SchemaTestable, string } from '#/schema/index.js';
import type { Enumeration as EnumerationType, EnumerationValue, Record, UndefinableJsonObject } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { lazyObject } from '#/utils/object/lazy-property.js';
import { hasOwnProperty, objectEntries } from '#/utils/object/object.js';
import { cancelableTimeout } from '#/utils/timing.js';
import { assertDefinedPass, assertNotNullPass, isDefined, isError, isNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import { resolveValueOrAsyncProvider } from '#/utils/value-or-provider.js';
import { AiFileService } from './ai-file.service.js';
import { AiSession } from './ai-session.js';
import { type AiModel, type Content, type ContentPart, type ContentRole, type FileContentPart, type FileInput, type FunctionCall, type FunctionCallingMode, type FunctionResultContentPart, type GenerationOptions, type GenerationRequest, type GenerationResult, isSchemaFunctionDeclarationWithHandler, type SchemaFunctionDeclarations, type SchemaFunctionDeclarationsResult } from './types.js';

export type SpecializedGenerationResult<T> = {
  result: T,
  raw: GenerationResult
};

export type SpecializedGenerationResultGenerator<T> = AsyncGenerator<T> & {
  raw: Promise<GenerationResult>
};

export class AiServiceOptions {
  apiKey?: string;
  keyFile?: string;
  vertex?: { project: string, location: string, bucket?: string };
  defaultModel?: AiModel;
};

export type AiServiceArgument = AiServiceOptions;

const functionCallingModeMap: Record<FunctionCallingMode, GoogleFunctionCallingMode> = {
  auto: GoogleFunctionCallingMode.AUTO,
  force: GoogleFunctionCallingMode.ANY,
  none: GoogleFunctionCallingMode.NONE
};

export type ClassificationResult<T extends EnumerationType> = { types: { type: EnumerationValue<T>, confidence: 'high' | 'medium' | 'low' }[] | null };

export type AnalyzeContentResult<T extends EnumerationType> = {
  content: string[],
  documentTypes: ClassificationResult<T>[],
  tags: string[]
};

export type CallFunctionsOptions<T extends SchemaFunctionDeclarations> = Pick<GenerationRequest, 'contents' | 'model' | 'systemInstruction' | 'functionCallingMode'> & GenerationOptions & {
  functions: T
};

@Singleton()
export class AiService implements Resolvable<AiServiceArgument> {
  readonly #options = injectArgument(this, { optional: true }) ?? inject(AiServiceOptions);
  readonly #fileService = inject(AiFileService, this.#options);
  readonly #logger = inject(Logger, AiService.name);

  readonly #genAI = (
    isDefined(this.#options.vertex)
      ? new VertexAI({ project: this.#options.vertex.project, location: this.#options.vertex.location, googleAuthOptions: { apiKey: this.#options.apiKey, keyFile: this.#options.keyFile } })
      : new GoogleGenerativeAI(assertDefinedPass(this.#options.apiKey, 'Api key not defined'))
  ) as VertexAI;

  readonly defaultModel = this.#options.defaultModel ?? 'gemini-2.0-flash' satisfies AiModel;

  declare readonly [resolveArgumentType]: AiServiceArgument;

  createSession(): AiSession {
    return new AiSession(this);
  }

  async processFile(fileInput: FileInput): Promise<FileContentPart> {
    return this.#fileService.processFile(fileInput);
  }

  async processFiles(fileInputs: FileInput[]): Promise<FileContentPart[]> {
    return this.#fileService.processFiles(fileInputs);
  }

  getFileById(id: string): FileContentPart {
    return { file: id };
  }

  async classify<T extends EnumerationType>(parts: OneOrMany<ContentPart>, types: T, options?: GenerationOptions & Pick<GenerationRequest, 'model'>): Promise<SpecializedGenerationResult<ClassificationResult<T>>> {
    const generationSchema = object({
      types: nullable(array(
        object({
          type: enumeration(types, { description: 'Type of document' }),
          confidence: enumeration(['high', 'medium', 'low'], { description: 'How sure/certain you are about the classficiation' })
        }),
        { description: 'One or more document types that matches' }
      ))
    });

    const generation = await this.generate({
      model: options?.model,
      generationOptions: {
        maxOutputTokens: 1048,
        temperature: 0.5,
        ...options
      },
      generationSchema,
      systemInstruction: 'You are a highly accurate document classification AI. Your task is to analyze the content of a given document and determine its type based on a predefined list of possible document types.',
      contents: this.getClassifyContents(parts)
    });

    return {
      result: JSON.parse(assertNotNullPass(generation.text, 'No text returned.')),
      raw: generation
    };
  }

  getClassifyContents(parts: OneOrMany<ContentPart>): Content[] {
    return [{
      role: 'user',
      parts: [
        ...toArray(parts),
        { text: 'Classify the document. Output as JSON using the provided schema\n\nIf none of the provided document types are a suitable match, return null for types.' }
      ]
    }];
  }

  async extractData<T>(parts: OneOrMany<ContentPart>, schema: SchemaTestable<T>, options?: GenerationOptions & Pick<GenerationRequest, 'model'>): Promise<SpecializedGenerationResult<T>> {
    const generation = await this.generate({
      model: options?.model,
      generationOptions: {
        temperature: 0.5,
        ...options
      },
      generationSchema: schema as SchemaTestable,
      systemInstruction: `You are a highly skilled data extraction AI, specializing in accurately identifying and extracting information from unstructured text documents and converting it into a structured JSON format. Your primary goal is to meticulously follow the provided JSON schema and populate it with data extracted from the given document.

**Instructions:**
Carefully read and analyze the provided document. Identify relevant information that corresponds to each field in the JSON schema. Focus on accuracy and avoid making assumptions. If a field has multiple possible values, extract all relevant ones into the correct array structures ONLY IF the schema defines that field as an array; otherwise, extract only the single most relevant value.`,
      contents: this.getExtractDataConents(parts)
    });

    return {
      result: JSON.parse(assertNotNullPass(generation.text, 'No text returned.')),
      raw: generation
    };
  }

  getExtractDataConents(parts: OneOrMany<ContentPart>): Content[] {
    return [{
      role: 'user',
      parts: [
        ...toArray(parts),
        { text: 'Extract the data as specified in the schema. Output as JSON.' }
      ]
    }];
  }

  async analyzeContent<T extends EnumerationType>(parts: OneOrMany<ContentPart>, types: T, options?: GenerationOptions & { targetLanguage?: string, maximumNumberOfTags?: number }): Promise<SpecializedGenerationResult<AnalyzeContentResult<T>>> {
    const schema = object({
      content: string({ description: 'Content of the document with important details only' }),
      types: nullable(array(
        object({
          type: enumeration(types, { description: 'Type of document' }),
          confidence: enumeration(['high', 'medium', 'low'], { description: 'How sure/certain you are about the classficiation' })
        }),
        { description: 'One or more document types that matches' }
      )),
      tags: array(string({ description: 'Tag which describes the content' }), { description: 'List of tags', maximum: options?.maximumNumberOfTags ?? 5 })
    });

    const generation = await this.generate({
      generationOptions: {
        maxOutputTokens: 2048,
        temperature: 0.5,
        ...options
      },
      generationSchema: schema,
      systemInstruction: `You are a highly skilled data extraction AI, specializing in accurately identifying and extracting information from unstructured content and converting it into a structured JSON format. Your primary goal is to meticulously follow the provided JSON schema and populate it with data extracted from the given document.

**Instructions:**
Carefully read and analyze the provided content.
Identify key points and relevant information that describes the content. Focus on a general overview without providing specific details.
Classify the content based on the provided list of types.
Output up to ${options?.maximumNumberOfTags ?? 5} tags.
Always output the content and tags in ${options?.targetLanguage ?? 'the same language as the content'}.`,
      contents: this.getAnalyzeContentConents(parts)
    });

    return {
      result: JSON.parse(assertNotNullPass(generation.text, 'No text returned.')),
      raw: generation
    };
  }

  getAnalyzeContentConents(parts: OneOrMany<ContentPart>): Content[] {
    return [{
      role: 'user',
      parts: [
        ...toArray(parts),
        { text: 'Classify the document. Output as JSON.' }
      ]
    }];
  }

  async callFunctions<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): Promise<SpecializedGenerationResult<SchemaFunctionDeclarationsResult<T>[]> & { getFunctionResultContentParts: () => FunctionResultContentPart[] }> {
    const generation = await this.generate({
      model: options.model,
      generationOptions: {
        temperature: 0.5,
        ...options
      },
      systemInstruction: options.systemInstruction,
      functions: options.functions,
      functionCallingMode: options.functionCallingMode ?? 'force',
      contents: options.contents
    });

    const result: SchemaFunctionDeclarationsResult<T>[] = [];

    for (const call of generation.functionCalls) {
      const fn = assertDefinedPass(options.functions[call.name], 'Function in response not declared.');
      const parametersSchema = await resolveValueOrAsyncProvider(fn.parameters);
      const parameters = isDefined(parametersSchema) ? parametersSchema.parse(call.parameters) as Record : call.parameters;
      const handlerResult = isSchemaFunctionDeclarationWithHandler(fn) ? await fn.handler(parameters) : undefined;

      result.push({
        functionName: call.name,
        parameters: parameters as any,
        handlerResult: handlerResult as any,
        getFunctionResultContentPart: () => ({ functionResult: { name: call.name, value: handlerResult as any } })
      });
    }

    return {
      result,
      raw: generation,
      getFunctionResultContentParts: () => result.map((result) => result.getFunctionResultContentPart())
    };
  }

  callFunctionsStream<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): SpecializedGenerationResultGenerator<SchemaFunctionDeclarationsResult<T>> {
    const itemsPromise = new DeferredPromise<GenerationResult[]>();
    const generator = this._callFunctionsStream(options, itemsPromise) as SpecializedGenerationResultGenerator<SchemaFunctionDeclarationsResult<T>>;

    generator.raw = new LazyPromise(async () => {
      const items = await itemsPromise;
      return mergeGenerationStreamItems(items);
    });

    return generator;
  }

  async generate<S>(request: GenerationRequest<S>): Promise<GenerationResult<S>> {
    const items = await toArrayAsync(this.generateStream(request));
    return mergeGenerationStreamItems(items, request.generationSchema);
  }

  async *generateStream<S>(request: GenerationRequest<S>): AsyncGenerator<GenerationResult<S>> {
    this.#logger.verbose('Generating...');
    const googleFunctionDeclarations = isDefined(request.functions) ? await this.convertFunctions(request.functions) : undefined;

    const generationConfig: GenerationConfig = {
      maxOutputTokens: request.generationOptions?.maxOutputTokens,
      temperature: request.generationOptions?.temperature,
      topP: request.generationOptions?.topP,
      topK: request.generationOptions?.topK,
      responseMimeType: isDefined(request.generationSchema) ? 'application/json' : undefined,
      responseSchema: isDefined(request.generationSchema) ? convertToOpenApiSchema(request.generationSchema) : undefined,
      frequencyPenalty: request.generationOptions?.frequencyPenalty
    };

    const model = request.model ?? this.defaultModel;
    const maxModelTokens = model.includes('thinking') ? 65536 : 8192;
    const maxTotalOutputTokens = request.generationOptions?.maxOutputTokens ?? maxModelTokens;
    const inputContent = this.convertContents(request.contents);

    let iterations = 0;
    let totalPromptTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    while (totalOutputTokens < maxTotalOutputTokens) {
      let generation: StreamGenerateContentResult;

      for (let i = 0; ; i++) {
        try {
          generation = await this.getModel(model).generateContentStream({
            generationConfig: {
              ...generationConfig,
              maxOutputTokens: Math.min(maxModelTokens, maxTotalOutputTokens - totalOutputTokens)
            },
            systemInstruction: request.systemInstruction,
            tools: (isDefined(googleFunctionDeclarations) && (googleFunctionDeclarations.length > 0)) ? [{ functionDeclarations: googleFunctionDeclarations }] : undefined,
            toolConfig: isDefined(request.functionCallingMode)
              ? { functionCallingConfig: { mode: functionCallingModeMap[request.functionCallingMode] } }
              : undefined,
            contents: inputContent
          });

          break;
        }
        catch (error) {
          if ((i < 20) && isError(error) && ((error as Record)['status'] == 429)) {
            this.#logger.verbose('429 Too Many Requests - trying again in 15 seconds');
            const canceled = await cancelableTimeout(15 * millisecondsPerSecond, getShutdownSignal());

            if (!canceled) {
              continue;
            }
          }

          throw error;
        }
      }

      iterations++;

      let lastUsageMetadata: UsageMetadata | undefined;
      let candidate: GenerateContentCandidate | undefined;

      for await (const generationResponse of generation.stream) {
        candidate = generationResponse.candidates!.at(0)!;
        inputContent.push(candidate.content);

        const { promptTokenCount = 0, candidatesTokenCount = 0 } = generationResponse.usageMetadata as (Partial<UsageMetadata> | undefined) ?? {};
        lastUsageMetadata = generationResponse.usageMetadata;

        const content = this.convertGoogleContent(candidate.content);
        let text: string | null;
        let functionCallParts: FunctionCall[] | undefined;

        const result: GenerationResult<S> = {
          content,
          get text() {
            if (isUndefined(text)) {
              const textParts = content.parts.filter((part) => hasOwnProperty(part, 'text')).map((part) => part.text);
              text = (textParts.length > 0) ? textParts.join('') : null;
            }

            return text;
          },
          get json(): any {
            throw new NotSupportedError('JSON not supported in streamed items. Use mergeGenerationStreamItems to combine all streamed items.');
          },
          get functionCalls() {
            if (isUndefined(functionCallParts)) {
              functionCallParts = content.parts.filter((part) => hasOwnProperty(part, 'functionCall')).map((part) => part.functionCall);
            }

            return functionCallParts;
          },
          finishReason: candidate.finishReason == FinishReason.MAX_TOKENS
            ? 'maxTokens'
            : candidate.finishReason == FinishReason.STOP
              ? 'stop'
              : 'unknown',
          usage: {
            iterations,
            prompt: totalPromptTokens + promptTokenCount,
            output: totalOutputTokens + candidatesTokenCount,
            total: totalTokens + promptTokenCount + candidatesTokenCount
          }
        };

        yield result;
      }

      totalPromptTokens += lastUsageMetadata?.promptTokenCount ?? 0;
      totalOutputTokens += lastUsageMetadata?.candidatesTokenCount ?? 0;
      totalTokens += lastUsageMetadata?.totalTokenCount ?? 0;

      if (candidate?.finishReason != FinishReason.MAX_TOKENS) {
        break;
      }
    }
  }

  private async *_callFunctionsStream<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>, itemsPromise: DeferredPromise<GenerationResult[]>): AsyncGenerator<SchemaFunctionDeclarationsResult<T>> {
    const generationStream = this.generateStream({
      model: options.model,
      generationOptions: {
        temperature: 0.5,
        ...options
      },
      systemInstruction: options.systemInstruction,
      functions: options.functions,
      functionCallingMode: options.functionCallingMode ?? 'force',
      contents: options.contents
    });

    const items: GenerationResult[] = [];

    for await (const generation of generationStream) {
      items.push(generation);

      for (const call of generation.functionCalls) {
        const fn = assertDefinedPass(options.functions[call.name], 'Function in response not declared.');
        const parametersSchema = await resolveValueOrAsyncProvider(fn.parameters);
        const parameters = isDefined(parametersSchema) ? parametersSchema.parse(call.parameters) as Record : call.parameters;
        const handlerResult = isSchemaFunctionDeclarationWithHandler(fn) ? await fn.handler(parameters) : undefined;

        yield {
          functionName: call.name,
          parameters: parameters as any,
          handlerResult: handlerResult as any,
          getFunctionResultContentPart: () => ({ functionResult: { name: call.name, value: handlerResult as any } })
        };
      }
    }

    itemsPromise.resolve(items);
  }

  private convertContents(contents: Content | readonly Content[]): GoogleContent[] {
    return toArray(contents).map((content) => this.convertContent(content));
  }

  private convertContent(content: Content): GoogleContent {
    return {
      role: content.role,
      parts: content.parts.map((part): Part => {
        if (hasOwnProperty(part, 'text')) {
          return { text: part.text };
        }

        if (hasOwnProperty(part, 'file')) {
          const file = assertDefinedPass(this.#fileService.getFileById(part.file), `File ${part.file} not found.`);
          return { fileData: { fileUri: file.uri, mimeType: file.mimeType } };
        }

        if (hasOwnProperty(part, 'functionResult')) {
          return { functionResponse: { name: part.functionResult.name, response: part.functionResult.value } };
        }

        if (hasOwnProperty(part, 'functionCall')) {
          return { functionCall: { name: part.functionCall.name, args: part.functionCall.parameters } };
        }

        throw new NotSupportedError('Unsupported content part.');
      })
    };
  }

  private async convertFunctions(functions: SchemaFunctionDeclarations): Promise<FunctionDeclaration[]> {
    const mapped = mapAsync(objectEntries(functions), async ([name, declaration]): Promise<FunctionDeclaration | undefined> => {
      const enabled = await resolveValueOrAsyncProvider(declaration.enabled);

      if (enabled == false) {
        return undefined;
      }

      const parametersSchema = await resolveValueOrAsyncProvider(declaration.parameters);

      return {
        name,
        description: declaration.description,
        parameters: isDefined(parametersSchema) ? convertToOpenApiSchema(parametersSchema) as any as FunctionDeclarationSchema : undefined
      };
    });

    const functionsArray = await toArrayAsync(mapped);
    return functionsArray.filter(isDefined);
  }

  private convertGoogleContent(content: GoogleContent): Content {
    return {
      role: content.role as ContentRole,
      parts: isUndefined(content.parts)
        ? []
        : content.parts
          .map((part): ContentPart | null => {
            if (isDefined(part.text)) {
              if (part.text.length == 0) {
                return null;
              }

              return { text: part.text };
            }

            if (isDefined(part.fileData)) {
              const file = assertDefinedPass(this.#fileService.getFileByUri(part.fileData.fileUri), 'File not found.');
              return { file: file.id };
            }

            if (isDefined(part.functionResponse)) {
              return { functionResult: { name: part.functionResponse.name, value: part.functionResponse.response as any } };
            }

            if (isDefined(part.functionCall)) {
              return { functionCall: { name: part.functionCall.name, parameters: part.functionCall.args as UndefinableJsonObject } };
            }

            throw new NotSupportedError('Unsupported content part.');
          })
          .filter(isNotNull)
    };
  }

  private getModel(model: AiModel) {
    return this.#genAI.getGenerativeModel({ model });
  }
}

export function mergeGenerationStreamItems<S>(items: GenerationResult<S>[], schema?: SchemaTestable<S>): GenerationResult<S> {
  const parts = items.flatMap((item) => item.content.parts);

  let text: string | null;
  let functionCallParts: FunctionCall[] | undefined;

  return lazyObject<GenerationResult<S>>({
    content: { value: { role: 'model', parts } },
    text() {
      if (isUndefined(text)) {
        const textParts = parts.filter((part) => hasOwnProperty(part, 'text')).map((part) => part.text);
        text = (textParts.length > 0) ? textParts.join('') : null;
      }

      return text;
    },
    json() {
      if (isUndefined(schema)) {
        return undefined as any;
      }

      if (isNull(this.text)) {
        throw new Error('No text to parse available.');
      }

      return Schema.parse(schema, JSON.parse(this.text));
    },
    functionCalls() {
      if (isUndefined(functionCallParts)) {
        functionCallParts = parts.filter((part) => hasOwnProperty(part, 'functionCall')).map((part) => part.functionCall);
      }

      return functionCallParts;
    },
    finishReason: { value: items.at(-1)!.finishReason },
    usage: { value: items.at(-1)!.usage }
  });
}
