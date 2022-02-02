import type { Injectable } from '#/container';
import { resolveArgumentType } from '#/container';
import type { Lock } from './lock';

/** prefix */
export type LockProviderArgument = string;

export abstract class LockProvider implements Injectable<LockProviderArgument> {
  readonly [resolveArgumentType]: LockProviderArgument;

  abstract prefix(prefix: string): LockProvider;
  abstract get(resource: string): Lock;
}
