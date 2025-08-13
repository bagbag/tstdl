import { FinishReason, type FunctionDeclaration, type GenerateContentConfig, type GenerateContentResponse, type Candidate as GoogleCandidate, type Content as GoogleContent, FunctionCallingConfigMode as GoogleFunctionCallingMode, GoogleGenAI, type Schema as GoogleSchema, type Model, type Part, type UsageMetadata } from '@google/genai';

import { CancellationSignal } from '#/cancellation/index.js';
import { NotSupportedError } from '#/errors/not-supported.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Logger } from '#/logger/logger.js';
import { DeferredPromise } from '#/promise/deferred-promise.js';
import { LazyPromise } from '#/promise/lazy-promise.js';
import { convertToOpenApiSchema } from '#/schema/converters/openapi-converter.js';
import { Schema, type SchemaTestable } from '#/schema/index.js';
import type { Enumeration as EnumerationType, EnumerationValue, Record, UndefinableJsonObject } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { backoffGenerator, type BackoffGeneratorOptions } from '#/utils/backoff.js';
import { lazyObject } from '#/utils/object/lazy-property.js';
import { hasOwnProperty, objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, isDefined, isError, isNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import { resolveValueOrAsyncProvider } from '#/utils/value-or-provider.js';
import { AiFileService } from './ai-file.service.js';
import { AiSession } from './ai-session.js';
import { type AiModel, type Content, type ContentPart, type ContentRole, type FileContentPart, type FileInput, type FunctionCall, type FunctionCallingMode, type GenerationOptions, type GenerationRequest, type GenerationResult, isSchemaFunctionDeclarationWithHandler, type SchemaFunctionDeclarations, type SchemaFunctionDeclarationsResult } from './types.js';

/**
 * A generation result that includes a specialized, typed result alongside the raw generation data.
 * @template T The type of the specialized result.
 */
export type SpecializedGenerationResult<T> = {
  /** The specialized, typed result. */
  result: T,

  /** The raw, underlying generation result from the AI model. */
  raw: GenerationResult,
};

/**
 * An async generator for specialized generation results, which also provides access to the final raw generation data.
 * @template T The type of the specialized result yielded by the generator.
 */
export type SpecializedGenerationResultGenerator<T> = AsyncGenerator<T> & {
  raw: Promise<GenerationResult>,
};

/**
 * Options for configuring the {@link AiService}.
 */
export class AiServiceOptions {
  /** Google AI API key. */
  apiKey?: string;

  /** Path to the Google Cloud credentials file. */
  keyFile?: string;

  /** Vertex AI specific options. If provided, the service will use Vertex AI endpoints. */
  vertex?: { project: string, location: string, bucket?: string };

  /**
   * The default model to use for generation requests.
   * @default 'gemini-2.5-flash-lite'
   */
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

/**
 * Options for a function-calling request.
 * @template T The schema declarations for the available functions.
 */
export type CallFunctionsOptions<T extends SchemaFunctionDeclarations> = Pick<GenerationRequest, 'contents' | 'model' | 'systemInstruction' | 'functionCallingMode'> & GenerationOptions & {
  /** The function declarations available for the model to call. */
  functions: T,
};

let generationCounter = 0;

/**
 * A service for interacting with Google's Generative AI models (Gemini).
 *
 * This service provides methods for content generation, function calling, and file processing,
 * supporting both standard Google AI and Vertex AI endpoints.
 */
@Singleton()
export class AiService implements Resolvable<AiServiceArgument> {
  readonly #options = injectArgument(this, { optional: true }) ?? inject(AiServiceOptions);
  readonly #fileService = inject(AiFileService, this.#options);
  readonly #logger = inject(Logger, AiService.name);
  readonly #cancellationSignal = inject(CancellationSignal);

  readonly #genAI = new GoogleGenAI({
    vertexai: isDefined(this.#options.vertex?.project),
    project: this.#options.vertex?.project,
    location: this.#options.vertex?.location,
    googleAuthOptions: isDefined(this.#options.vertex?.project) ? { apiKey: this.#options.apiKey, keyFile: this.#options.keyFile } : undefined,
    apiKey: isUndefined(this.#options.vertex?.project) ? assertDefinedPass(this.#options.apiKey, 'Api key not defined') : undefined,
  });

  readonly #maxOutputTokensCache = new Map<string, number | Promise<number>>();

  readonly #backoffOptions: BackoffGeneratorOptions = {
    cancellationSignal: this.#cancellationSignal,
    strategy: 'exponential',
    initialDelay: 2500,
    increase: 1.5,
    jitter: 0.2,
    maximumDelay: 30000,
  };

  /**
   * The default AI model to use for requests if not specified otherwise.
   */
  readonly defaultModel = this.#options.defaultModel ?? 'gemini-2.5-flash-lite' satisfies AiModel;

  declare readonly [resolveArgumentType]: AiServiceArgument;

  /**
   * Creates a new {@link AiSession} for managing conversational history.
   */
  createSession(): AiSession {
    return new AiSession(this);
  }

  /**
   * Processes a single file for use in AI requests by uploading it and making it available to the model.
   * @param fileInput The file to process.
   * @returns A promise that resolves to a {@link FileContentPart} which can be included in a generation request.
   */
  async processFile(fileInput: FileInput): Promise<FileContentPart> {
    return await this.#fileService.processFile(fileInput);
  }

  /**
   * Processes multiple files in parallel for use in AI requests.
   * @param fileInputs The files to process.
   * @returns A promise that resolves to an array of {@link FileContentPart}s which can be included in generation requests.
   */
  async processFiles(fileInputs: FileInput[]): Promise<FileContentPart[]> {
    return await this.#fileService.processFiles(fileInputs);
  }

  /**
   * Creates a file content part from a previously processed file ID.
   * This does not re-upload the file.
   * @param id The ID of the file, obtained from {@link AiFileService.processFile} or {@link AiFileService.processFiles}.
   * @returns A {@link FileContentPart} for use in a generation request.
   */
  getFileById(id: string): FileContentPart {
    return { file: id };
  }

  /**
   * A high-level method to prompt the model to call one or more functions.
   * This method sends the request and parses the model's response to identify function calls.
   * If the function declaration includes a handler, it will be executed automatically.
   * @param options The options for the function call request.
   * @returns A promise that resolves to a {@link SpecializedGenerationResult} containing the function call results.
   */
  async callFunctions<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): Promise<SpecializedGenerationResult<SchemaFunctionDeclarationsResult<T>[]>> {
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
    };
  }

  /**
   * A streaming version of `callFunctions`.
   * Yields function call results as they are received from the model.
   * If function declarations include handlers, they are executed as soon as a complete function call is parsed.
   * @param options The options for the function call request.
   * @returns A {@link SpecializedGenerationResultGenerator} that yields function call results.
   */
  callFunctionsStream<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): SpecializedGenerationResultGenerator<SchemaFunctionDeclarationsResult<T>> {
    const itemsPromise = new DeferredPromise<GenerationResult[]>();
    const generator = this._callFunctionsStream(options, itemsPromise) as SpecializedGenerationResultGenerator<SchemaFunctionDeclarationsResult<T>>;

    generator.raw = new LazyPromise(async () => {
      const items = await itemsPromise;
      return mergeGenerationStreamItems(items);
    });

    return generator;
  }

  /**
   * Generates content from the model based on a request.
   * This method waits for the full response from the model. For streaming, use {@link generateStream}.
   * @param request The generation request.
   * @returns A promise that resolves to the complete {@link GenerationResult}.
   */
  async generate<S>(request: GenerationRequest<S>): Promise<GenerationResult<S>> {
    const items = await toArrayAsync(this.generateStream(request));
    return mergeGenerationStreamItems(items, request.generationSchema);
  }

  /**
   * Generates content as a stream.
   * Yields partial generation results as they are received from the model.
   * @param request The generation request.
   * @returns An `AsyncGenerator` that yields {@link GenerationResult} chunks.
   */
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
      let generation!: AsyncGenerator<GenerateContentResponse>;

      let triesLeft = 10;
      for await (const backoff of backoffGenerator(this.#backoffOptions)) {
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
          triesLeft -= 1;

          if ((triesLeft > 0) && isError(error) && (error.message.includes('429 Too Many Requests') || error.message.includes('503 Service Unavailable'))) {
            this.#logger.verbose(`Retrying after transient error: ${error.message}`);
            backoff();
            continue;
          }

          throw error; // Non-retryable error
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
    let modelInfo!: Model;

    let triesLeft = 10;
    for await (const backoff of backoffGenerator(this.#backoffOptions)) {
      try {
        modelInfo = await this.#genAI.models.get({ model });
        break;
      }
      catch (error) {
        triesLeft -= 1;

        if ((triesLeft > 0) && isError(error) && (error.message.includes('429 Too Many Requests') || error.message.includes('503 Service Unavailable'))) {
          this.#logger.verbose(`Could not get model info for ${model} due to a transient error (${error.message}). Retrying...`);
          backoff();
          continue;
        }

        throw error;
      }
    }

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

/**
 * Merges an array of streaming generation results into a single, consolidated result.
 * This is useful for combining the chunks from a streaming response into a final object.
 * @param items The array of {@link GenerationResult} items from a stream.
 * @param schema An optional schema to parse the merged JSON output.
 * @returns A single, merged {@link GenerationResult}.
 */
export function mergeGenerationStreamItems<S>(items: GenerationResult<S>[], schema?: SchemaTestable<S>): GenerationResult<S> {
  if (items.length == 0) {
    return {
      content: { role: 'model', parts: [] },
      text: null,
      json: undefined as S,
      functionCalls: [],
      finishReason: 'unknown',
      usage: { iterations: 0, prompt: 0, output: 0, total: 0 },
    };
  }

  const parts = items.flatMap((item) => item.content.parts);

  return lazyObject<GenerationResult<S>>({
    content: { value: { role: 'model', parts } },
    text() {
      const textParts = parts.filter((part) => hasOwnProperty(part, 'text')).map((part) => part.text);
      return (textParts.length > 0) ? textParts.join('') : null;
    },
    json() {
      if (isUndefined(schema)) {
        return undefined as S;
      }

      if (isNull(this.text)) {
        throw new Error('No text to parse available.');
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(this.text);
      }
      catch (error) {
        throw new Error(`Failed to parse model output as JSON. Raw text: "${this.text}"`, { cause: error });
      }

      return Schema.parse(schema, parsed);
    },
    functionCalls() {
      return parts.filter((part) => hasOwnProperty(part, 'functionCall')).map((part) => part.functionCall);
    },
    finishReason: { value: items.at(-1)!.finishReason },
    usage: { value: items.at(-1)!.usage },
  });
}
