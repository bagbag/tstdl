import type { LiteralUnion } from 'type-fest';

import type { ObjectSchema, SchemaOutput, SchemaTestable } from '#/schema/index.js';
import type { Record, UndefinableJsonObject } from '#/types.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';

export type FileInput = { path: string, mimeType: string } | Blob;

export type SchemaFunctionDeclarations = Record<string, SchemaFunctionDeclaration<any>>;

export type SchemaFunctionDeclarationWithoutHandler<T extends Record = Record> = { description: string, parameters: ObjectSchema<T> };
export type SchemaFunctionDeclarationWithHandler<T extends Record = Record, R = unknown> = SchemaFunctionDeclarationWithoutHandler<T> & { handler: (parameters: T) => R | Promise<R> };
export type SchemaFunctionDeclaration<T extends Record = Record, R = unknown> = SchemaFunctionDeclarationWithoutHandler<T> | SchemaFunctionDeclarationWithHandler<T, R>;

export type SchemaFunctionDeclarationHandlerResult<T extends SchemaFunctionDeclaration> = T extends SchemaFunctionDeclarationWithHandler<any, infer R> ? R : never;
export type SchemaFunctionDeclarationsResult<T extends SchemaFunctionDeclarations = SchemaFunctionDeclarations> = { [P in keyof T]: { functionName: P, parameters: SchemaOutput<T[P]['parameters']>, handlerResult: SchemaFunctionDeclarationHandlerResult<T[P]> } }[keyof T];

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

export type AiModel = LiteralUnion<'gemini-2.0-flash-exp' | 'gemini-exp-1206' | 'gemini-2.0-flash-thinking-exp-1219', string>;

export type GenerationOptions = {
  maxOutputTokens?: number,
  temperature?: number,
  topP?: number,
  topK?: number,
  presencePenalty?: number,
  frequencyPenalty?: number
};

export type GenerationRequest = {
  model?: AiModel,
  systemInstruction?: string,
  contents: readonly Content[],
  functions?: SchemaFunctionDeclarations,
  functionCallingMode?: FunctionCallingMode,
  generationSchema?: SchemaTestable,
  generationOptions?: GenerationOptions
};

export type GenerationUsage = {
  prompt: number,
  output: number,
  total: number
};

export type GenerationResult = {
  content: Content,
  text: string | null,
  functionCalls: FunctionCall[],
  usage: GenerationUsage
};

export function declareFunctions<T extends SchemaFunctionDeclarations>(declarations: T): T {
  return declarations;
}

export function declareFunction<T extends Record = Record>(description: string, parameters: ObjectSchema<T>): SchemaFunctionDeclaration<T, never>;
export function declareFunction<T extends Record = Record, R = never>(description: string, parameters: ObjectSchema<T>, handler: (parameters: T) => R | Promise<R>): SchemaFunctionDeclaration<T, R>;
export function declareFunction<T extends Record = Record, R = never>(description: string, parameters: ObjectSchema<T>, handler?: (parameters: T) => R | Promise<R>): SchemaFunctionDeclaration<T, R> {
  if (isDefined(handler)) {
    return { description, parameters, handler };
  }

  return { description, parameters };
}

export function isSchemaFunctionDeclarationWithHandler(declaration: SchemaFunctionDeclaration): declaration is SchemaFunctionDeclarationWithHandler {
  return hasOwnProperty(declaration, 'handler');
}
