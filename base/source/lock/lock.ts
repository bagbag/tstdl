import type { Resolvable } from '#/injector/index.js';
import { resolveArgumentType } from '#/injector/index.js';

export type LockedFunction<R> = (controller: LockController) => R | Promise<R>;

export type AcquireResult<Throw extends boolean> = Throw extends true
  ? LockController
  : (LockController | false);

export type UsingResult<Throw extends boolean, R> =
  Throw extends true
  ? ({ success: true, result: R })
  : ({ success: true, result: R } | { success: false, result: undefined });

export interface LockController {
  /**
   * whether the the lock is lost or not. Can happen for example if it couldn't be renewed
   * because the network connection is lost (depending on implementation)
   */
  readonly lost: boolean;

  /** manually release lock */
  release(): void | Promise<void>;
}

/** resource */
export type LockArgument = string | { prefix?: string, resource: string };

export abstract class Lock implements Resolvable<LockArgument> {
  readonly resource: string;

  declare readonly [resolveArgumentType]: LockArgument;
  constructor(resource: string) {
    this.resource = resource;
  }

  /**
   * acquire a lock for the resource, it must be manually released
   * @param timeout how long to try to get a lock. If undefined it's tries forever
   * @param throwOnFail throw if resource is locked and we couldn't acquire it in the specified timeout
   */
  abstract acquire<Throw extends boolean>(timeout: number | undefined, throwOnFail: Throw): Promise<AcquireResult<Throw>>;

  /**
   * acquire a lock for the resource and release it automatically after the provided function has returned or thrown
   * @param timeout how long to try to get a lock. If undefined it's tries forever
   * @param throwOnFail throw if resource is locked and we couldn't acquire it in the specified timeout
   * @param func function to run when lock is acquired
   */
  abstract use<Throw extends boolean, R>(timeout: number | undefined, throwOnFail: Throw, func: LockedFunction<R>): Promise<UsingResult<Throw, R>>;

  /** check if resource is locked */
  abstract exists(): Promise<boolean>;
}
