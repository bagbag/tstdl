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

export interface Lock {
  acquire<Throw extends boolean>(timeout: number, throwOnFail: Throw): Promise<AcquireResult<Throw>>;
  using<Throw extends boolean, R>(timeout: number, throwOnFail: Throw, func: LockedFunction<R>): Promise<UsingResult<Throw, R>>;
  exists(): Promise<boolean>;
}
