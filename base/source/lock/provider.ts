import type { Injectable, resolveArgumentType } from '#/container/index.js';
import type { Lock } from './lock.js';

/** prefix */
export type LockProviderArgument = string;

export abstract class LockProvider implements Injectable<LockProviderArgument> {
  declare readonly [resolveArgumentType]: LockProviderArgument;

  abstract prefix(prefix: string): LockProvider;
  abstract get(resource: string): Lock;
}
