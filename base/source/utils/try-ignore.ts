import type { Logger } from '#/logger/logger.js';

export function tryIgnore<R>(fn: () => R): R;
export function tryIgnore<R, F>(fn: () => R, fallback: F): R | F;
export function tryIgnore<R, F>(fn: () => R, fallback?: F): R | F {
  try {
    return fn();
  }
  catch {
    return fallback!;
  }
}

export async function tryIgnoreAsync<R>(fn: () => Promise<R>): Promise<R>;
export async function tryIgnoreAsync<R, F>(fn: () => Promise<R>, fallback: F): Promise<F>;
export async function tryIgnoreAsync<R, F>(fn: () => Promise<R>, fallback?: F): Promise<R | F> {
  try {
    const value = await fn();
    return value;
  }
  catch {
    return fallback!;
  }
}

export function tryIgnoreLog<R>(fn: () => R, logger: Logger): R;
export function tryIgnoreLog<R, F>(fn: () => R, logger: Logger, fallback: F): R | F;
export function tryIgnoreLog<R, F>(fn: () => R, logger: Logger, fallback?: F): R | F {
  try {
    return fn();
  }
  catch (error) {
    logger.error(error);
    return fallback!;
  }
}

export async function tryIgnoreLogAsync<R>(fn: () => Promise<R>, logger: Logger): Promise<R>;
export async function tryIgnoreLogAsync<R, F>(fn: () => Promise<R>, logger: Logger, fallback: F): Promise<F>;
export async function tryIgnoreLogAsync<R, F>(fn: () => Promise<R>, logger: Logger, fallback?: F): Promise<R | F> {
  try {
    const value = await fn();
    return value;
  }
  catch (error) {
    logger.error(error);
    return fallback!;
  }
}
