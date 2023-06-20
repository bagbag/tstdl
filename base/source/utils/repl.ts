import type { ReplOptions } from 'node:repl';
import { start as startRepl } from 'node:repl';

import type { Record } from '#/types.js';
import { objectEntries } from './object/object.js';
import { isDefined } from './type-guards.js';

/**
 * Starts an interactive (repl) session (node only)
 * @param context context to set the repl context to
 */
export async function repl(options?: ReplOptions & { context?: Record<string> }): Promise<void> {
  const replServer = startRepl(options);

  if (isDefined(options?.context)) {
    for (const [key, value] of objectEntries(options!.context)) {
      replServer.context[key] = value;
    }
  }

  await new Promise((resolve) => replServer.once('exit', resolve));
}
