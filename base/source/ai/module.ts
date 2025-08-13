import { Injector } from '#/injector/injector.js';
import { AiServiceOptions } from './ai.service.js';

/**
 * Options for configuring the AI module.
 * @see {@link AiServiceOptions}
 */
export type ApiModuleOptions = AiServiceOptions;

/**
 * Configures the {@link AiService}.
 * @param options The configuration options for the AI services.
 */
export function configureAiService(options: ApiModuleOptions): void {
  Injector.register(AiServiceOptions, { useValue: options });
}
