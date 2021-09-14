import { firstValueFrom } from '#/rxjs/compat';
import { mapTo, race, timer } from 'rxjs';
import type { CancellationToken } from './cancellation-token';

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

export async function cancelableTimeout(milliseconds: number, cancelToken: CancellationToken): Promise<boolean> {
  return firstValueFrom(race([
    timer(milliseconds).pipe(mapTo(false)), // eslint-disable-line @typescript-eslint/no-unsafe-argument
    cancelToken.set$.pipe(mapTo(true)) // eslint-disable-line @typescript-eslint/no-unsafe-argument
  ]));
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

export async function idle(timeout?: number): Promise<IdleDeadline> { // eslint-disable-line @typescript-eslint/no-shadow
  return new Promise<IdleDeadline>((resolve) => requestIdleCallback(resolve, { timeout }));
}
