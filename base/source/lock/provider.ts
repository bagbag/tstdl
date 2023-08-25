import type { Resolvable } from '#/injector/index.js';
import { resolveArgumentType } from '#/injector/index.js';
import type { Lock } from './lock.js';

/** prefix */
export type LockProviderArgument = string;

export abstract class LockProvider implements Resolvable<LockProviderArgument> {
  declare readonly [resolveArgumentType]: LockProviderArgument;

  abstract prefix(prefix: string): LockProvider;
  abstract get(resource: string): Lock;
}
