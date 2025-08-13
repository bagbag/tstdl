import type { OneOrMany } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import type { AiService, CallFunctionsOptions, SpecializedGenerationResult } from './ai.service.js';
import type { Content, GenerationRequest, GenerationResult, SchemaFunctionDeclarations, SchemaFunctionDeclarationsResult } from './types.js';

/**
 * Represents a conversational session with an AI model.
 *
 * This class maintains the history of contents (messages) in a conversation,
 * allowing for stateful, multi-turn interactions with the AI.
 */
export class AiSession {
  readonly #aiService: AiService;

  /**
   * The history of contents in the session.
   */
  readonly contents: Content[] = [];

  /**
   * Creates an instance of `AiSession`.
   * @param aiService The {@link AiService} instance to use for AI interactions.
   */
  constructor(aiService: AiService) {
    this.#aiService = aiService;
  }

  /**
   * Adds new content to the session's history without triggering a generation.
   * @param content The content or contents to add.
   */
  addContent(content: OneOrMany<Content>): void {
    this.contents.push(...toArray(content));
  }

  /**
   * Prompts the model to call one or more functions based on the provided context and session history.
   * The new user content and the resulting model response (function calls) are automatically added to the session history.
   * @param options The options for the function call request.
   */
  async callFunctions<const T extends SchemaFunctionDeclarations>(options: CallFunctionsOptions<T>): Promise<SpecializedGenerationResult<SchemaFunctionDeclarationsResult<T>[]>> {
    this.contents.push(...toArray(options.contents));

    const result = await this.#aiService.callFunctions({ ...options, contents: this.contents });
    this.contents.push(result.raw.content);

    return result;
  }

  /**
   * Generates content from the model based on the provided request and the current session history.
   * The new user content and the resulting model response are automatically added to the session history.
   * @param request The generation request.
   */
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    this.contents.push(...toArray(request.contents));

    const result = await this.#aiService.generate({ ...request, contents: this.contents });
    this.contents.push(result.content);

    return result;
  }
}
