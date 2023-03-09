import type { AnimationOptions } from './animation-options';

export function getAnimateTimings(options?: AnimationOptions): string {
  return `${options?.duration ?? 250}ms ${options?.delay ?? 0}ms ${options?.ease ?? 'ease-in-out'}`;
}
