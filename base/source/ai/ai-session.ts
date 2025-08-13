import type { OneOrMany } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import type { AiService, CallFunctionsOptions, SpecializedGenerationResult } from './ai.service.js';
import type { Content, GenerationRequest, GenerationResult, SchemaFunctionDeclarations, SchemaFunctionDeclarationsResult } from './types.js';

export class AiSession {
  readonly #aiService: AiService;
  readonly contents: Content[] = [];

  constructor(aiService: AiService) {
    this.#aiService = aiService;
  }

  addContent(content: OneOrMany<Content>): void {
    this.contents.push(...toArray(content));
  }

  async callFunctions<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): Promise<SpecializedGenerationResult<SchemaFunctionDeclarationsResult<T>[]>> {
    this.contents.push(...toArray(options.contents));

    const result = await this.#aiService.callFunctions({ ...options, contents: this.contents });
    this.contents.push(result.raw.content);

    return result;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    this.contents.push(...toArray(request.contents));

    const result = await this.#aiService.generate({ ...request, contents: this.contents });
    this.contents.push(result.content);

    return result;
  }
}
