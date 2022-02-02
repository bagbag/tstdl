import type { Injectable } from '#/container';
import { resolveArgumentType } from '#/container';

export type LockedFunction<R> = (controller: LockController) => R | Promise<R>;

export type AcquireResult<Throw extends boolean> = Throw extends true
  ? LockController
  : (LockController | false);

export type UsingResult<Throw extends boolean, R> =
  Throw extends true
  ? ({ success: true, result: R })
  : ({ success: true, result: R } | { success: false, result: undefined });

export interface LockController {
  readonly lost: boolean;
  release(): Promise<void>;
}

/** resource */
export type LockArgument = string | { prefix?: string, resource: string };

export abstract class Lock implements Injectable<LockArgument> {
  readonly resource: string;

  readonly [resolveArgumentType]: LockArgument;

  constructor(resource: string) {
    this.resource = resource;
  }

  abstract acquire<Throw extends boolean>(timeout: number, throwOnFail: Throw): Promise<AcquireResult<Throw>>;
  abstract using<Throw extends boolean, R>(timeout: number, throwOnFail: Throw, func: LockedFunction<R>): Promise<UsingResult<Throw, R>>;
  abstract exists(): Promise<boolean>;
}
