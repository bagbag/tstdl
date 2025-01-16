import type { SchemaTestable } from '#/schema/index.js';
import type { Enumeration, OneOrMany, TypedOmit } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import type { AiService, AnalyzeContentResult, ClassificationResult, SpecializedGenerationResult } from './ai.service.js';
import type { Content, ContentPart, GenerationOptions, GenerationRequest, GenerationResult, SchemaFunctionDeclarations, SchemaFunctionDeclarationsResult } from './types.js';

export class AiSession {
  readonly #aiService: AiService;
  readonly contents: Content[] = [];

  constructor(aiService: AiService) {
    this.#aiService = aiService;
  }

  addContent(content: OneOrMany<Content>): void {
    this.contents.push(...toArray(content));
  }

  async analyzeContent<T extends Enumeration>(parts: OneOrMany<ContentPart>, types: T, options?: GenerationOptions & { targetLanguage?: string, maximumNumberOfTags?: number }): Promise<SpecializedGenerationResult<AnalyzeContentResult<T>>> {
    const newContents = this.#aiService.getAnalyzeContentConents(parts);
    this.contents.push(...newContents);

    const result = await this.#aiService.analyzeContent(parts, types, options);
    this.contents.push(result.raw.content);

    return result;
  }

  async classify<T extends Enumeration>(parts: OneOrMany<ContentPart>, types: T, options?: GenerationOptions & Pick<GenerationRequest, 'model'>): Promise<SpecializedGenerationResult<ClassificationResult<T>>> {
    const newContents = this.#aiService.getExtractDataConents(parts);
    this.contents.push(...newContents);

    const result = await this.#aiService.classify(parts, types, options);
    this.contents.push(result.raw.content);

    return result;
  }

  async extractData<T>(parts: OneOrMany<ContentPart>, schema: SchemaTestable<T>, options?: GenerationOptions & Pick<GenerationRequest, 'model'>): Promise<SpecializedGenerationResult<T>> {
    const newContents = this.#aiService.getExtractDataConents(parts);
    this.contents.push(...newContents);

    const result = await this.#aiService.extractData(parts, schema, options);
    this.contents.push(result.raw.content);

    return result;
  }

  async callFunctions<const T extends SchemaFunctionDeclarations>(functions: T, content: Content | [Content, ...Content[]], options?: Pick<GenerationRequest, 'model' | 'systemInstruction'> & GenerationOptions): Promise<SpecializedGenerationResult<SchemaFunctionDeclarationsResult<T>[]>> {
    this.contents.push(...toArray(content));

    const result = await this.#aiService.callFunctions(functions, this.contents, options);
    this.contents.push(result.raw.content);

    return result;
  }

  async generate(content: Content | [Content, ...Content[]], request?: TypedOmit<GenerationRequest, 'contents'>): Promise<GenerationResult> {
    this.contents.push(...toArray(content));

    const result = await this.#aiService.generate({ ...request, contents: this.contents });
    this.contents.push(result.content);

    return result;
  }
}
