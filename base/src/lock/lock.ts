export type LockedFunction = (controller: LockController) => void | Promise<void>;

export interface LockController {
  readonly lost: boolean;
  release(): Promise<void>;
}

export interface Lock {
  acquire(timeout: number): Promise<LockController | false>;
  acquire(timeout: number, func: LockedFunction): Promise<boolean>;
  exists(): Promise<boolean>;
}
