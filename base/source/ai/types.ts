import type { LiteralUnion } from 'type-fest';

import type { ObjectSchema, SchemaOutput, SchemaTestable } from '#/schema/index.js';
import type { Record, UndefinableJsonObject } from '#/types/index.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import type { ResolvedValueOrProvider, ValueOrAsyncProvider } from '#/utils/value-or-provider.js';
import { isBlob } from '#/utils/type-guards.js';

/**
 * Represents a file to be uploaded, either from a local path or as a `Blob`.
 */
export type FileInput =
  | { path: string, mimeType: string }
  | { stream: ReadableStream<Uint8Array>, mimeType: string, size?: number }
  | Blob;

/**
 * A record of named function declarations, where each key is the function name.
 */
export type SchemaFunctionDeclarations = Record<string, SchemaFunctionDeclaration<any>>;

/**
 * A function declaration that only defines the function's signature (name, description, parameters).
 * @template T The record type for the function's parameters.
 */
export type SchemaFunctionDeclarationWithoutHandler<T extends Record = Record> = { description: string, parameters?: ValueOrAsyncProvider<ObjectSchema<T>>, enabled?: ValueOrAsyncProvider<boolean> };

/**
 * A function declaration that includes a handler to be executed when the function is called by the model.
 * @template T The record type for the function's parameters.
 * @template R The return type of the handler.
 */
export type SchemaFunctionDeclarationWithHandler<T extends Record = Record, R = unknown> = SchemaFunctionDeclarationWithoutHandler<T> & { handler: (parameters: T) => R | Promise<R> };

/**
 * A union of a function declaration with or without a handler.
 * @template T The record type for the function's parameters.
 * @template R The return type of the handler if it exists.
 */
export type SchemaFunctionDeclaration<T extends Record = Record, R = unknown> = SchemaFunctionDeclarationWithoutHandler<T> | SchemaFunctionDeclarationWithHandler<T, R>;

/**
 * Extracts the return type of a function declaration's handler.
 * If the declaration has no handler, it resolves to `never`.
 * @template T The function declaration type.
 */
export type SchemaFunctionDeclarationHandlerResult<T extends SchemaFunctionDeclaration> = T extends SchemaFunctionDeclarationWithHandler<any, infer R> ? R : never;

/**
 * Represents the result of a function call, typed based on the provided declarations.
 * This is a distributive conditional type that maps over the function declarations.
 * @template T The schema declarations for the available functions.
 */
export type SchemaFunctionDeclarationsResult<T extends SchemaFunctionDeclarations = SchemaFunctionDeclarations> = {
  [P in keyof T]: {
    /** The name of the function that was called. */
    functionName: P,

    /** The parameters passed to the function call, parsed against the schema. */
    parameters: SchemaOutput<NonNullable<ResolvedValueOrProvider<T[P]['parameters']>>>,

    /** The result of executing the handler, if one was provided. */
    handlerResult: SchemaFunctionDeclarationHandlerResult<T[P]>,

    /** A function to get the content part representing the function result, for use in subsequent AI requests. */
    getFunctionResultContentPart: () => FunctionResultContentPart,
  }
}[keyof T];

/**
 * The role of the author of a piece of content.
 */
export type ContentRole = 'user' | 'model';

/** A part of a `Content` object containing text. */
export type TextContentPart = { text: string };

/** A part of a `Content` object referencing a processed file via its ID. */
export type FileContentPart = { file: string };

/** Represents a function call requested by the model. */
export type FunctionCall = { name: string, parameters: UndefinableJsonObject };

/** A part of a `Content` object representing a function call request from the model. */
export type FunctionCallContentPart = { functionCall: FunctionCall };

/** The result of a function execution. */
export type FunctionResult = { name: string, value: UndefinableJsonObject };

/** A part of a `Content` object representing the result of a function call. */
export type FunctionResultContentPart = { functionResult: FunctionResult };

/** A union of all possible content part types. */
export type ContentPart = TextContentPart | FileContentPart | FunctionCallContentPart | FunctionResultContentPart;

/** A single message in a conversation, containing a role and one or more parts. */
export type Content = { role: ContentRole, parts: readonly ContentPart[] };

/**
 * Specifies the mode for function calling.
 * - `auto`: The model decides whether to call a function.
 * - `force`: The model is forced to call a function.
 * - `none`: The model will not call any functions.
 */
export type FunctionCallingMode = 'auto' | 'force' | 'none';

/**
 * The reason why the model stopped generating content.
 */
export type FinishReason = 'stop' | 'maxTokens' | 'unknown';

/**
 * The specific AI model to use for a request.
 */
export type AiModel = LiteralUnion<'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite', string>;

/**
 * Options to control the generation process.
 */
export type GenerationOptions = {
  /** The maximum number of tokens to generate in the response. */
  maxOutputTokens?: number,

  /** Controls the randomness of the output. Higher values (closer to 1.0) make the output more random. */
  temperature?: number,

  /** The cumulative probability of tokens to consider for sampling. */
  topP?: number,

  /** The number of highest-probability tokens to consider for sampling. */
  topK?: number,

  /** A penalty for tokens that have already appeared in the text. */
  presencePenalty?: number,

  /** A penalty for tokens based on their frequency in the text. */
  frequencyPenalty?: number,

  /**
   * The maximum number of tokens the model is allowed to generate for its thinking phase.
   */
  thinkingBudget?: number,
};

/**
 * A request to generate content from the AI model.
 * @template S The expected type of the `json` property in the result if `generationSchema` is provided.
 */
export type GenerationRequest<S = unknown> = {
  /** The model to use for the request. If not provided, a default will be used. */
  model?: AiModel,

  /** A system instruction to guide the model's behavior. */
  systemInstruction?: string,

  /** The content or conversation history to send to the model. */
  contents: Content | readonly Content[],

  /** A set of functions the model can call. */
  functions?: SchemaFunctionDeclarations,

  /** The mode for function calling. */
  functionCallingMode?: FunctionCallingMode,

  /** A schema to which the model's output should conform. Implies `responseMimeType: 'application/json'`. */
  generationSchema?: SchemaTestable<S>,

  /** Options to control the generation process. */
  generationOptions?: GenerationOptions,
};

/**
 * Token usage statistics for a generation request.
 */
export type GenerationUsage = {
  /** The number of generation iterations (usually 1, more if `maxOutputTokens` is hit and generation continues). */
  iterations: number,

  /** The number of tokens in the prompt. */
  prompt: number,

  /** The number of tokens in the generated output. */
  output: number,

  /** The total number of tokens used. */
  total: number,
};

/**
 * The result of a generation request.
 * @template S The expected type of the `json` property if a schema was provided in the request.
 */
export type GenerationResult<S = unknown> = {
  /** The content generated by the model. */
  content: Content,

  /** The complete text generated by the model, or `null` if no text was generated. */
  text: string | null,

  /** The text parsed as JSON, conforming to the provided schema. `undefined` if no schema was provided. */
  json: S,

  /** An array of function calls requested by the model. */
  functionCalls: FunctionCall[],

  /** The reason why the model stopped generating. */
  finishReason: FinishReason,

  /** Token usage statistics for the request. */
  usage: GenerationUsage,
};

/**
 * A helper function to define a set of function declarations with strong type inference.
 * @param declarations A record of function declarations.
 * @returns The same record of declarations, with types preserved.
 */
export function defineFunctions<T extends SchemaFunctionDeclarations>(declarations: T): T {
  return declarations;
}

/**
 * A helper function to define a single function declaration with strong type inference,
 * particularly for its parameters.
 * @param declaration The function declaration.
 * @returns The same declaration, with types preserved.
 */
export function defineFunction<P extends Record, T extends SchemaFunctionDeclaration<P>>(declaration: T & Pick<SchemaFunctionDeclaration<P>, 'parameters'>): T {
  return declaration;
}

/**
 * A type guard to check if a function declaration includes a handler.
 * @param declaration The function declaration to check.
 * @returns `true` if the declaration has a `handler` property, `false` otherwise.
 */
export function isSchemaFunctionDeclarationWithHandler(declaration: SchemaFunctionDeclaration): declaration is SchemaFunctionDeclarationWithHandler {
  return hasOwnProperty(declaration, 'handler');
}

export function isPathFileInput(input: FileInput): input is { path: string, mimeType: string } {
  return !isBlob(input) && hasOwnProperty(input, 'path');
}

export function isStreamFileInput(input: FileInput): input is { stream: ReadableStream<Uint8Array>, mimeType: string, size?: number } {
  return !isBlob(input) && hasOwnProperty(input, 'stream');
}
