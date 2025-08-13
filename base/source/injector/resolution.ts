import { createContextProvider } from '#/context/index.js';
import type { Record } from '#/types/index.js';
import type { Resolvable } from './interfaces.js';
import type { AfterResolveContext } from './types.js';

export type AfterResolveHandler<A, D extends Record> = (argument: A, context: AfterResolveContext<D>) => void | Promise<void>;

export type ResolutionContext<A> = {
  afterResolveRegistrations: AfterResolveHandler<A, any>[],
};

const { assertInResolutionContext, getCurrentResolutionContext, runInResolutionContext } = createContextProvider<ResolutionContext<any>, 'Resolution'>('Resolution');

/**
 * Registers a handler function to be called after a dependency has been resolved.
 *
 * @param handler - The function to execute after resolution. It receives the resolved instance and the associated record.
 */
export function registerAfterResolve(handler: AfterResolveHandler<unknown, Record>): void;
export function registerAfterResolve<A, D extends Record>(_this: Resolvable<A, D>, handler: AfterResolveHandler<A, D>): void;
export function registerAfterResolve<A, D extends Record>(thisOrHandler: Resolvable<A, D> | AfterResolveHandler<A, D>, handlerOrNothing?: AfterResolveHandler<A, D>): void {
  getCurrentResolutionContext(true, registerAfterResolve).afterResolveRegistrations.push(handlerOrNothing ?? thisOrHandler as AfterResolveHandler<A, D>);
}

export { assertInResolutionContext, getCurrentResolutionContext, runInResolutionContext };
