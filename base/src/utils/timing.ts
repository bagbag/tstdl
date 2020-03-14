declare const process: { nextTick(callback: () => void, ...args: unknown[]): void }; // eslint-disable-line init-declarations
declare function requestIdleCallback(callback: IdleRequestCallback, options?: { timeout?: number }): void;

export type FrameRequestCallback = (time: number) => void;
export type IdleRequestCallback = (idleDeadline: IdleDeadline) => void;

export interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining(): DOMHighResTimeStamp;
}

export async function timeout(milliseconds: number = 0): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function cancelableTimeout(milliseconds: number, cancelPromise: PromiseLike<void>): Promise<boolean> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<boolean>((resolve) => {
    let pending = true;

    const timer = setTimeout(() => {
      if (pending) {
        pending = false;
        resolve(false);
      }
    }, milliseconds);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    cancelPromise.then(() => {
      if (pending) {
        pending = false;
        clearTimeout(timer);
        resolve(true);
      }
    });
  });
}

export async function immediate(): Promise<void> {
  return new Promise<void>(setImmediate as (callback: () => void) => void);
}

export async function nextTick(): Promise<void> {
  return new Promise<void>((resolve) => process.nextTick(resolve));
}

export async function animationFrame(): Promise<number> {
  return new Promise<number>(requestAnimationFrame);
}

// eslint-disable-next-line no-shadow
export async function idle(timeout?: number): Promise<IdleDeadline> {
  return new Promise<IdleDeadline>((resolve) => requestIdleCallback(resolve, { timeout }));
}
