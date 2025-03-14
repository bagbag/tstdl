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

export function tryIgnoreLog<R>(logger: Logger, fn: () => R): R;
export function tryIgnoreLog<R, F>(logger: Logger, fn: () => R, fallback: F): R | F;
export function tryIgnoreLog<R, F>(logger: Logger, fn: () => R, fallback?: F): R | F {
  try {
    return fn();
  }
  catch (error) {
    logger.error(error);
    return fallback!;
  }
}

export async function tryIgnoreLogAsync<R>(logger: Logger, fn: () => Promise<R>): Promise<R>;
export async function tryIgnoreLogAsync<R, F>(logger: Logger, fn: () => Promise<R>, fallback: F): Promise<F>;
export async function tryIgnoreLogAsync<R, F>(logger: Logger, fn: () => Promise<R>, fallback?: F): Promise<R | F> {
  try {
    const value = await fn();
    return value;
  }
  catch (error) {
    logger.error(error);
    return fallback!;
  }
}
