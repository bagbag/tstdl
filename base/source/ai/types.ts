import type { LiteralUnion } from 'type-fest';

import type { ObjectSchema, SchemaOutput, SchemaTestable } from '#/schema/index.js';
import type { Record, UndefinableJsonObject } from '#/types.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import type { ResolvedValueOrProvider, ValueOrAsyncProvider } from '#/utils/value-or-provider.js';

export type FileInput = { path: string, mimeType: string } | Blob;

export type SchemaFunctionDeclarations = Record<string, SchemaFunctionDeclaration<any>>;

export type SchemaFunctionDeclarationWithoutHandler<T extends Record = Record> = { description: string, parameters?: ValueOrAsyncProvider<ObjectSchema<T>>, enabled?: ValueOrAsyncProvider<boolean> };
export type SchemaFunctionDeclarationWithHandler<T extends Record = Record, R = unknown> = SchemaFunctionDeclarationWithoutHandler<T> & { handler: (parameters: T) => R | Promise<R> };
export type SchemaFunctionDeclaration<T extends Record = Record, R = unknown> = SchemaFunctionDeclarationWithoutHandler<T> | SchemaFunctionDeclarationWithHandler<T, R>;

export type SchemaFunctionDeclarationHandlerResult<T extends SchemaFunctionDeclaration> = T extends SchemaFunctionDeclarationWithHandler<any, infer R> ? R : never;
export type SchemaFunctionDeclarationsResult<T extends SchemaFunctionDeclarations = SchemaFunctionDeclarations> = {
  [P in keyof T]: {
    functionName: P,
    parameters: SchemaOutput<NonNullable<ResolvedValueOrProvider<T[P]['parameters']>>>,
    handlerResult: SchemaFunctionDeclarationHandlerResult<T[P]>,
    getFunctionResultContentPart: () => FunctionResultContentPart,
  }
}[keyof T];

export type ContentRole = 'user' | 'model';

export type TextContentPart = { text: string };
export type FileContentPart = { file: string };
export type FunctionCall = { name: string, parameters: UndefinableJsonObject };
export type FunctionCallContentPart = { functionCall: FunctionCall };
export type FunctionResult = { name: string, value: UndefinableJsonObject };
export type FunctionResultContentPart = { functionResult: FunctionResult };

export type ContentPart = TextContentPart | FileContentPart | FunctionCallContentPart | FunctionResultContentPart;

export type Content = { role: ContentRole, parts: readonly ContentPart[] };

export type FunctionCallingMode = 'auto' | 'force' | 'none';

export type FinishReason = 'stop' | 'maxTokens' | 'unknown';

export type AiModel = LiteralUnion<'gemini-2.5-pro-preview-05-06' | 'gemini-2.5-flash-preview-05-20', string>;

export type GenerationOptions = {
  maxOutputTokens?: number,
  temperature?: number,
  topP?: number,
  topK?: number,
  presencePenalty?: number,
  frequencyPenalty?: number,
  thinkingBudget?: number,
};

export type GenerationRequest<S = unknown> = {
  model?: AiModel,
  systemInstruction?: string,
  contents: Content | readonly Content[],
  functions?: SchemaFunctionDeclarations,
  functionCallingMode?: FunctionCallingMode,
  generationSchema?: SchemaTestable<S>,
  generationOptions?: GenerationOptions,
};

export type GenerationUsage = {
  iterations: number,
  prompt: number,
  output: number,
  total: number,
};

export type GenerationResult<S = unknown> = {
  content: Content,
  text: string | null,
  json: S,
  functionCalls: FunctionCall[],
  finishReason: FinishReason,
  usage: GenerationUsage,
};

export function defineFunctions<T extends SchemaFunctionDeclarations>(declarations: T): T {
  return declarations;
}

export function defineFunction<P extends Record, T extends SchemaFunctionDeclaration<P>>(declaration: T & Pick<SchemaFunctionDeclaration<P>, 'parameters'>): T {
  return declaration;
}

export function isSchemaFunctionDeclarationWithHandler(declaration: SchemaFunctionDeclaration): declaration is SchemaFunctionDeclarationWithHandler {
  return hasOwnProperty(declaration, 'handler');
}
