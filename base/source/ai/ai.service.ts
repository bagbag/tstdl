import { FinishReason, FunctionDeclaration, FunctionDeclarationSchema, GenerateContentCandidate, GenerationConfig, Content as GoogleContent, FunctionCallingMode as GoogleFunctionCallingMode, GoogleGenerativeAI, Part } from '@google/generative-ai';

import { NotSupportedError } from '#/errors/not-supported.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import { Resolvable, type resolveArgumentType } from '#/injector/interfaces.js';
import { convertToOpenApiSchema } from '#/schema/converters/openapi-converter.js';
import { array, enumeration, nullable, object, OneOrMany, SchemaTestable, string } from '#/schema/index.js';
import { Enumeration as EnumerationType, EnumerationValue, Record, UndefinableJsonObject } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { hasOwnProperty, objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, assertNotNullPass, isDefined } from '#/utils/type-guards.js';
import { AiFileService } from './ai-file.service.js';
import { AiSession } from './ai-session.js';
import { AiModel, Content, ContentPart, ContentRole, FileContentPart, FileInput, FunctionCallingMode, GenerationOptions, GenerationRequest, GenerationResult, isSchemaFunctionDeclarationWithHandler, SchemaFunctionDeclarations, SchemaFunctionDeclarationsResult } from './types.js';

export type SpecializedGenerationResult<T> = {
  result: T,
  raw: GenerationResult
};

export class AiServiceOptions {
  apiKey: string;
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

export type CallFunctionsOptions<T extends SchemaFunctionDeclarations> = Pick<GenerationRequest, 'contents' | 'model' | 'systemInstruction'> & GenerationOptions & {
  functions: T
};

@Singleton()
export class AiService implements Resolvable<AiServiceArgument> {
  readonly #options = injectArgument(this, { optional: true }) ?? inject(AiServiceOptions);
  readonly #fileService = inject(AiFileService, this.#options);

  readonly #genAI = new GoogleGenerativeAI(this.#options.apiKey);
  readonly defaultModel = this.#options.defaultModel ?? 'gemini-2.0-flash-exp' satisfies AiModel;

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
      contents: this.getClassifyConents(parts)
    });

    return {
      result: JSON.parse(assertNotNullPass(generation.text, 'No text returned.')),
      raw: generation
    };
  }

  getClassifyConents(parts: OneOrMany<ContentPart>): Content[] {
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

  async callFunctions<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): Promise<SpecializedGenerationResult<SchemaFunctionDeclarationsResult<T>[]>> {
    const generation = await this.generate({
      model: options.model,
      generationOptions: {
        temperature: 0.5,
        ...options
      },
      systemInstruction: options.systemInstruction,
      functions: options.functions,
      functionCallingMode: 'force',
      contents: options.contents
    });

    const result: SchemaFunctionDeclarationsResult<T>[] = [];

    for (const call of generation.functionCalls) {
      const fn = assertDefinedPass(options.functions[call.name], 'Function in response not declared.');
      const parameters = fn.parameters.parse(call.parameters) as Record;
      const handlerResult = isSchemaFunctionDeclarationWithHandler(fn) ? await fn.handler(parameters) : undefined;

      result.push({ functionName: call.name, parameters: parameters as any, handlerResult: handlerResult as any });
    }

    return {
      result,
      raw: generation
    };
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const googleFunctionDeclarations = isDefined(request.functions) ? this.convertFunctions(request.functions) : undefined;

    const generationConfig: GenerationConfig = {
      maxOutputTokens: request.generationOptions?.maxOutputTokens,
      temperature: request.generationOptions?.temperature,
      topP: request.generationOptions?.topP,
      topK: request.generationOptions?.topK,
      responseMimeType: isDefined(request.generationSchema) ? 'application/json' : undefined,
      responseSchema: isDefined(request.generationSchema) ? convertToOpenApiSchema(request.generationSchema) : undefined,
      presencePenalty: request.generationOptions?.presencePenalty,
      frequencyPenalty: request.generationOptions?.frequencyPenalty
    };

    const googleContent = this.convertContents(request.contents);
    const generationContent: GoogleContent = { role: 'model', parts: [] };
    const maxTotalOutputTokens = request.generationOptions?.maxOutputTokens ?? 8192;

    let iterations = 0;
    let totalPromptTokens = 0;
    let totalOutputTokens = 0;
    let candidate!: GenerateContentCandidate;

    while (totalOutputTokens < maxTotalOutputTokens) {
      const generation = await this.getModel(request.model ?? this.defaultModel).generateContent({
        generationConfig: {
          ...generationConfig,
          maxOutputTokens: Math.min(8192, maxTotalOutputTokens - totalOutputTokens)
        },
        systemInstruction: request.systemInstruction,
        tools: isDefined(googleFunctionDeclarations) ? [{ functionDeclarations: googleFunctionDeclarations }] : undefined,
        toolConfig: isDefined(request.functionCallingMode)
          ? { functionCallingConfig: { mode: functionCallingModeMap[request.functionCallingMode] } }
          : undefined,
        contents: googleContent
      });

      iterations++;
      candidate = generation.response.candidates!.at(0)!;

      // On first generation only
      if (generationContent.parts.length == 0) {
        googleContent.push(generationContent);
      }

      generationContent.parts.push(...candidate.content.parts);
      totalPromptTokens += generation.response.usageMetadata!.promptTokenCount;
      totalOutputTokens += generation.response.usageMetadata!.candidatesTokenCount;

      if (candidate.finishReason != FinishReason.MAX_TOKENS) {
        break;
      }
    }

    const content = this.convertGoogleContent(generationContent);
    const textParts = content.parts.filter((part) => hasOwnProperty(part, 'text')).map((part) => part.text);
    const functionCallParts = content.parts.filter((part) => hasOwnProperty(part, 'functionCall')).map((part) => part.functionCall);

    return {
      content,
      text: textParts.length > 0 ? textParts.join('') : null,
      functionCalls: functionCallParts,
      finishReason: candidate.finishReason == FinishReason.MAX_TOKENS
        ? 'maxTokens'
        : candidate.finishReason == FinishReason.STOP
          ? 'stop'
          : 'unknown',
      usage: {
        iterations,
        prompt: totalPromptTokens,
        output: totalOutputTokens,
        total: totalPromptTokens + totalOutputTokens
      }
    };
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

  private convertFunctions(functions: SchemaFunctionDeclarations): FunctionDeclaration[] {
    return objectEntries(functions).map(([name, declaration]): FunctionDeclaration => ({
      name,
      description: declaration.description,
      parameters: convertToOpenApiSchema(declaration.parameters) as any as FunctionDeclarationSchema
    }));
  }

  private convertGoogleContent(content: GoogleContent): Content {
    return {
      role: content.role as ContentRole,
      parts: content.parts.map((part): ContentPart => {
        if (isDefined(part.text)) {
          return { text: part.text };
        }

        if (isDefined(part.fileData)) {
          const file = assertDefinedPass(this.#fileService.getFileByUri(part.fileData.fileUri), 'File not found.');
          return { file: file.id };
        };

        if (isDefined(part.functionResponse)) {
          return { functionResult: { name: part.functionResponse.name, value: part.functionResponse.response as any } };
        }

        if (isDefined(part.functionCall)) {
          return { functionCall: { name: part.functionCall.name, parameters: part.functionCall.args as UndefinableJsonObject } };
        }

        throw new NotSupportedError('Unsupported content part.');
      })
    };
  }

  private getModel(model: AiModel) {
    return this.#genAI.getGenerativeModel({ model });
  }
}
