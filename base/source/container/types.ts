import type { AbstractConstructor } from '#/types.js';
import type { Container } from './container.js';
import type { InjectionToken } from './token.js';

export type ResolveContext = Pick<Container, 'resolve' | 'resolveAsync'> & {
  isAsync: boolean
};

export type Mapper<T = any, U = unknown> = (value: T) => U | Promise<U>;

export type ArgumentProvider<T = unknown> = (context: ResolveContext) => T | Promise<T>;

export type ForwardRefInjectionToken<T = any, A = any> = Exclude<InjectionToken<T, A>, AbstractConstructor> | (() => InjectionToken<T, A>); // eslint-disable-line @typescript-eslint/ban-types
