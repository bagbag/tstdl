import type { Record } from '#/types.js';
import type { Injector } from './injector.js';
import type { ResolveArgument } from './interfaces.js';
import type { InjectionToken } from './token.js';

/**
 * transient: new resolution for every resolve
 * resolution: one resolution per resolve tree
 * injector: one resolution per injector
 * singleton: one resolution at injector where token is registered
 */
export type Lifecycle = 'transient' | 'resolution' | 'injector' | 'singleton';

export type ResolveContext = Pick<Injector, 'resolve' | 'resolveAll'>;

export type Mapper<T = any, U = unknown> = (value: T) => U;

export type ArgumentProvider<T = unknown> = (context: ResolveContext) => T;

export type ForwardRefInjectionToken<T = any, A = any> = Exclude<InjectionToken<T, A>, Function> | (() => InjectionToken<T, A>); // eslint-disable-line @typescript-eslint/ban-types

export type ResolveOptions = {
  optional?: boolean,
  skipSelf?: boolean,
  onlySelf?: boolean
};

export type RegistrationOptions<T, A = unknown> = {
  lifecycle?: Lifecycle,

  /** Default resolve argument used when neither token nor explicit resolve argument is provided */
  defaultArgument?: ResolveArgument<T, A>,

  /** Default resolve argument used when neither token nor explicit resolve argument is provided */
  defaultArgumentProvider?: ArgumentProvider<ResolveArgument<T, A>>,

  /**
   * Value to distinguish scoped and singleton instances based on argument
   * by default it uses strict equality (===) on the original argument,
   * so modifications to argument objects and literal objects in the call
   * may not yield the expected result.
   *
   * Hint: {@link JSON.stringify} is a simple solution for many use cases,
   * but will fail if properties have different order
   */
  argumentIdentityProvider?: Mapper<ResolveArgument<T, A>>,

  /** Function which gets called after a resolve */
  afterResolve?: (instance: T, argument: ResolveArgument<T, A>) => any,

  /** Whether multiple values can be resolved or not (used with {@link Injector.resolveAll}). If false, previous registrations are removed */
  multi?: boolean,

  /** Custom metadata */
  metadata?: Record
};
