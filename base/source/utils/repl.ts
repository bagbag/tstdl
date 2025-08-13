import type { ReplOptions } from 'node:repl';

import { dynamicImport } from '#/import.js';
import type { Record } from '#/types/index.js';
import { objectEntries } from './object/object.js';
import { isDefined } from './type-guards.js';

/**
 * Starts an interactive (repl) session (node only)
 * @param context context to set the repl context to
 */
export async function repl(options?: ReplOptions & { context?: Record<string, unknown> }): Promise<void> {
  const { start: startRepl } = await dynamicImport<typeof import('node:repl')>('node:repl');
  const replServer = startRepl(options);

  if (isDefined(options?.context)) {
    for (const [key, value] of objectEntries(options.context)) {
      replServer.context[key] = value;
    }
  }

  await new Promise((resolve) => replServer.once('exit', resolve));
}
