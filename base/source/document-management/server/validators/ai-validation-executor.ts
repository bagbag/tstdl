import { AiService, type AiModel } from '#/ai/index.js';
import { defineEnum, type EnumType } from '#/enumeration/enumeration.js';
import { Singleton } from '#/injector/decorators.js';
import { inject } from '#/injector/inject.js';
import type { SchemaTestable } from '#/schema/schema.js';
import { match } from 'ts-pattern';
import { DocumentValidationExecutor, type DocumentValidationExecutorContext, type DocumentValidationExecutorResult } from './validator.js';

export const AiValidationDifficulty = defineEnum('AiValidationDifficulty', {
  Easy: 'easy',
  MediumLow: 'medium-low',
  MediumHigh: 'medium-high',
  Hard: 'hard',
});

export type AiValidationDifficulty = EnumType<typeof AiValidationDifficulty>;

@Singleton()
export abstract class AiValidationExecutor<R> extends DocumentValidationExecutor {
  protected readonly aiService = inject(AiService);

  abstract readonly schema: SchemaTestable<R>;
  abstract readonly difficulty: AiValidationDifficulty;

  override async execute(context: DocumentValidationExecutorContext): Promise<DocumentValidationExecutorResult> {
    const validationPrompt = await this.getPrompt(context);

    const model = match<AiValidationDifficulty, AiModel>(this.difficulty)
      .with('easy', () => 'gemini-2.5-flash-lite')
      .with('medium-low', () => 'gemini-2.5-flash')
      .with('medium-high', () => 'gemini-2.5-flash')
      .with('hard', () => 'gemini-2.5-pro')
      .exhaustive();

    const prompt = `Deine Aufgabe ist es ein Dokument zu validieren.

Validierungsaufgabe:
${validationPrompt}`;

    const generation = await this.aiService.generate({
      model,
      generationOptions: {
        temperature: 0.2,
        topK: 20,
      },
      generationSchema: this.schema,
      contents: [{
        role: 'user',
        parts: [{ text: prompt }],
      }],
    });

    return await this.getResult(generation.json);
  }

  abstract getPrompt(context: DocumentValidationExecutorContext): string | Promise<string>;
  abstract getResult(output: R): DocumentValidationExecutorResult | Promise<DocumentValidationExecutorResult>;
}
