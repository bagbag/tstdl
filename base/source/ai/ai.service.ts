import { FinishReason, type FunctionDeclaration, type GenerateContentConfig, type GenerateContentResponse, type Candidate as GoogleCandidate, type Content as GoogleContent, FunctionCallingConfigMode as GoogleFunctionCallingMode, GoogleGenAI, type Schema as GoogleSchema, type Part, type UsageMetadata } from '@google/genai';

import { NotSupportedError } from '#/errors/not-supported.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { getShutdownSignal } from '#/process-shutdown.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import { LazyPromise } from '#/promise/lazy-promise.js';
import { convertToOpenApiSchema } from '#/schema/converters/openapi-converter.js';
import { Schema, type SchemaTestable } from '#/schema/index.js';
import type { Enumeration as EnumerationType, EnumerationValue, Record, UndefinableJsonObject } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { lazyObject } from '#/utils/object/lazy-property.js';
import { hasOwnProperty, objectEntries } from '#/utils/object/object.js';
import { cancelableTimeout } from '#/utils/timing.js';
import { assertDefinedPass, isDefined, isError, isNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import { resolveValueOrAsyncProvider } from '#/utils/value-or-provider.js';
import { AiFileService } from './ai-file.service.js';
import { AiSession } from './ai-session.js';
import { type AiModel, type Content, type ContentPart, type ContentRole, type FileContentPart, type FileInput, type FunctionCall, type FunctionCallingMode, type FunctionResultContentPart, type GenerationOptions, type GenerationRequest, type GenerationResult, isSchemaFunctionDeclarationWithHandler, type SchemaFunctionDeclarations, type SchemaFunctionDeclarationsResult } from './types.js';

export type SpecializedGenerationResult<T> = {
  result: T,
  raw: GenerationResult,
};

export type SpecializedGenerationResultGenerator<T> = AsyncGenerator<T> & {
  raw: Promise<GenerationResult>,
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
  none: GoogleFunctionCallingMode.NONE,
};

export type ClassificationResult<T extends EnumerationType> = { types: { type: EnumerationValue<T>, confidence: 'high' | 'medium' | 'low' }[] | null };

export type AnalyzeContentResult<T extends EnumerationType> = {
  content: string[],
  documentTypes: ClassificationResult<T>[],
  tags: string[],
};

export type CallFunctionsOptions<T extends SchemaFunctionDeclarations> = Pick<GenerationRequest, 'contents' | 'model' | 'systemInstruction' | 'functionCallingMode'> & GenerationOptions & {
  functions: T,
};

let generationCounter = 0;

@Singleton()
export class AiService implements Resolvable<AiServiceArgument> {
  readonly #options = injectArgument(this, { optional: true }) ?? inject(AiServiceOptions);
  readonly #fileService = inject(AiFileService, this.#options);
  readonly #logger = inject(Logger, AiService.name);

  readonly #genAI = new GoogleGenAI({
    vertexai: isDefined(this.#options.vertex?.project),
    project: this.#options.vertex?.project,
    location: this.#options.vertex?.location,
    googleAuthOptions: isDefined(this.#options.vertex?.project) ? { apiKey: this.#options.apiKey, keyFile: this.#options.keyFile } : undefined,
    apiKey: isUndefined(this.#options.vertex?.project) ? assertDefinedPass(this.#options.apiKey, 'Api key not defined') : undefined,
  });

  readonly #maxOutputTokensCache = new Map<string, number | Promise<number>>();

  readonly defaultModel = this.#options.defaultModel ?? 'gemini-2.5-flash-lite-preview-06-17' satisfies AiModel;

  declare readonly [resolveArgumentType]: AiServiceArgument;

  createSession(): AiSession {
    return new AiSession(this);
  }

  async processFile(fileInput: FileInput): Promise<FileContentPart> {
    return await this.#fileService.processFile(fileInput);
  }

  async processFiles(fileInputs: FileInput[]): Promise<FileContentPart[]> {
    return await this.#fileService.processFiles(fileInputs);
  }

  getFileById(id: string): FileContentPart {
    return { file: id };
  }

  async callFunctions<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): Promise<SpecializedGenerationResult<SchemaFunctionDeclarationsResult<T>[]> & { getFunctionResultContentParts: () => FunctionResultContentPart[] }> {
    const generation = await this.generate({
      model: options.model,
      generationOptions: {
        temperature: 0.5,
        ...options,
      },
      systemInstruction: options.systemInstruction,
      functions: options.functions,
      functionCallingMode: options.functionCallingMode ?? 'force',
      contents: options.contents,
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
        getFunctionResultContentPart: () => ({ functionResult: { name: call.name, value: handlerResult as any } }),
      });
    }

    return {
      result,
      raw: generation,
      getFunctionResultContentParts: () => result.map((result) => result.getFunctionResultContentPart()),
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
    const generationNumber = ++generationCounter;
    const googleFunctionDeclarations = isDefined(request.functions) ? await this.convertFunctions(request.functions) : undefined;

    const config = {
      systemInstruction: request.systemInstruction,
      temperature: request.generationOptions?.temperature,
      topP: request.generationOptions?.topP,
      topK: request.generationOptions?.topK,
      presencePenalty: request.generationOptions?.presencePenalty,
      frequencyPenalty: request.generationOptions?.frequencyPenalty,
      responseMimeType: isDefined(request.generationSchema) ? 'application/json' : undefined,
      responseSchema: isDefined(request.generationSchema) ? convertToOpenApiSchema(request.generationSchema) : undefined,
      safetySettings: [],
      tools: (isDefined(googleFunctionDeclarations) && (googleFunctionDeclarations.length > 0)) ? [{ functionDeclarations: googleFunctionDeclarations }] : undefined,
      toolConfig: isDefined(request.functionCallingMode)
        ? { functionCallingConfig: { mode: functionCallingModeMap[request.functionCallingMode] } }
        : undefined,
      thinkingConfig: {
        thinkingBudget: request.generationOptions?.thinkingBudget,
      },
    } satisfies GenerateContentConfig;

    const model = request.model ?? this.defaultModel;
    const maxModelTokens = await this.getModelOutputTokenLimit(model);
    const maxTotalOutputTokens = request.generationOptions?.maxOutputTokens ?? maxModelTokens;
    const inputContent = this.convertContents(request.contents);

    let iterations = 0;
    let totalPromptTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;

    while (totalOutputTokens < maxTotalOutputTokens) {
      let generation: AsyncGenerator<GenerateContentResponse>;

      for (let i = 0; ; i++) {
        try {
          this.#logger.verbose(`[C:${generationNumber}] [I:${iterations + 1}] Generating...`);
          generation = await this.#genAI.models.generateContentStream({
            model,
            config: {
              ...config,
              maxOutputTokens: Math.min(maxModelTokens, maxTotalOutputTokens - totalOutputTokens),
            },
            contents: inputContent,
          });

          break;
        }
        catch (error) {
          if ((i < 20) && isError(error) && (error.message.includes('429 Too Many Requests') || (error.message.includes('503 Service Unavailable')))) {
            this.#logger.verbose('429 Too Many Requests - trying again in 15 seconds');
            const timeoutResult = await cancelableTimeout(15 * millisecondsPerSecond, getShutdownSignal());

            if (timeoutResult == 'timeout') {
              continue;
            }
          }

          throw error;
        }
      }

      iterations++;

      let lastUsageMetadata: UsageMetadata | undefined;
      let candidate: GoogleCandidate | undefined;

      for await (const generationResponse of generation) {
        candidate = generationResponse.candidates?.at(0);
        const rawContent = candidate?.content;

        if (isUndefined(candidate)) {
          throw new Error('No candidate returned.');
        }

        if (isUndefined(rawContent)) {
          throw new Error('No content returned.');
        }

        inputContent.push(rawContent);

        const { promptTokenCount = 0, candidatesTokenCount = 0 } = generationResponse.usageMetadata ?? {};
        lastUsageMetadata = generationResponse.usageMetadata;

        const content = this.convertGoogleContent(rawContent);
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
            total: totalTokens + promptTokenCount + candidatesTokenCount,
          },
        };

        yield result;
      }

      totalPromptTokens += lastUsageMetadata?.promptTokenCount ?? 0;
      totalOutputTokens += lastUsageMetadata?.responseTokenCount ?? 0;
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
        ...options,
      },
      systemInstruction: options.systemInstruction,
      functions: options.functions,
      functionCallingMode: options.functionCallingMode ?? 'force',
      contents: options.contents,
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
          getFunctionResultContentPart: () => ({ functionResult: { name: call.name, value: handlerResult as any } }),
        };
      }
    }

    itemsPromise.resolve(items);
  }

  private async getModelOutputTokenLimit(model: AiModel): Promise<number> {
    const existingValue = this.#maxOutputTokensCache.get(model);

    if (isDefined(existingValue)) {
      return await existingValue;
    }

    const promise = this._getModelOutputTokenLimit(model);
    this.#maxOutputTokensCache.set(model, promise);

    promise
      .then((limit) => this.#maxOutputTokensCache.set(model, limit))
      .catch(() => this.#maxOutputTokensCache.delete(model));

    return await promise;
  }

  private async _getModelOutputTokenLimit(model: AiModel): Promise<number> {
    const modelInfo = await this.#genAI.models.get({ model });

    if (isUndefined(modelInfo.outputTokenLimit)) {
      throw new Error(`Model ${model} does not support maxOutputTokens`);
    }

    return modelInfo.outputTokenLimit;
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
      }),
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
        parameters: isDefined(parametersSchema) ? convertToOpenApiSchema(parametersSchema) as any as GoogleSchema : undefined,
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
              const file = assertDefinedPass(this.#fileService.getFileByUri(assertDefinedPass(part.fileData.fileUri, 'Missing file uri')), 'File not found.');
              return { file: file.id };
            }

            if (isDefined(part.functionResponse)) {
              return { functionResult: { name: assertDefinedPass(part.functionResponse.name, 'Missing function name'), value: part.functionResponse.response as any } };
            }

            if (isDefined(part.functionCall)) {
              return { functionCall: { name: assertDefinedPass(part.functionCall.name, 'Missing function name'), parameters: part.functionCall.args as UndefinableJsonObject } };
            }

            throw new NotSupportedError('Unsupported content part.');
          })
          .filter(isNotNull),
    };
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
        return undefined as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
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
    usage: { value: items.at(-1)!.usage },
  });
}
