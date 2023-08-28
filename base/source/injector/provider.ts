import type { Constructor, Record, TypedOmit } from '#/types.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import { isFunction, isObject } from '#/utils/type-guards.js';
import type { ResolveArgument } from './interfaces.js';
import type { InjectionToken } from './token.js';
import type { AfterResolveContext, ResolveContext } from './types.js';

export type Factory<T, A = any, D extends Record = Record> = (argument: ResolveArgument<T, A>, context: ResolveContext<D>) => T;

export type ProviderWithArgument<T, A> = { defaultArgument?: ResolveArgument<T, A>, defaultArgumentProvider?: () => ResolveArgument<T, A> };

export type ProviderWithInitializer<T, A, D extends Record> = { afterResolve?: (value: T, argument: A, context: AfterResolveContext<D>) => void | Promise<void> };

export type Provider<T = any, A = any, D extends Record = Record> =
  | ClassProvider<T, A, D>
  | ValueProvider<T>
  | TokenProvider<T, A, D>
  | FactoryProvider<T, A, D>;

export type ClassProvider<T = any, A = any, D extends Record = Record> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A, D> & {
  useClass: Constructor<T>
};

export type ValueProvider<T = any> = {
  useValue: T
};

export type TokenProvider<T = any, A = any, D extends Record = Record> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A, D> & (
  | { useToken: InjectionToken<T, A>, useTokenProvider?: undefined }
  | { useToken?: undefined, useTokenProvider: () => InjectionToken<T, A> }
) & {
  /**
   * whether to resolve all providers registered for the token
   */
  resolveAll?: boolean
};

export type FactoryProvider<T = any, A = unknown, D extends Record = Record> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A, D> & {
  useFactory: Factory<T, A, D>
};

export function classProvider<T, A, D extends Record>(constructor: Constructor<T>, options?: TypedOmit<ClassProvider<T, A, D>, 'useClass'>): ClassProvider<T, A, D> {
  return { useClass: constructor, ...options };
}

export function valueProvider<T>(value: T, options?: TypedOmit<ValueProvider<T>, 'useValue'>): ValueProvider<T> {
  return { useValue: value, ...options };
}

export function tokenProvider<T, A, D extends Record>(token: InjectionToken<T, A>, options?: TypedOmit<TokenProvider<T, A, D>, 'useToken' | 'useTokenProvider'>): TokenProvider<T> {
  return { useToken: token, ...options };
}

export function factoryProvider<T, A, D extends Record>(factory: Factory<T, A, D>, options?: TypedOmit<FactoryProvider<T, A, D>, 'useFactory'>): FactoryProvider<T, A, D> {
  return { useFactory: factory, ...options };
}

export function isClassProvider<T, A>(value: Provider<T, A>): value is ClassProvider<T, A>;
export function isClassProvider<T, A>(value: unknown): value is ClassProvider<T, A>;
export function isClassProvider<T, A>(value: unknown): value is ClassProvider<T, A> {
  return isObject(value) && hasOwnProperty((value as ClassProvider), 'useClass');
}

export function isValueProvider<T>(value: Provider<T>): value is ValueProvider<T>;
export function isValueProvider<T>(value: unknown): value is ValueProvider<T>;
export function isValueProvider<T>(value: unknown): value is ValueProvider<T> {
  return isObject(value) && hasOwnProperty((value as ValueProvider), 'useValue');
}

export function isTokenProvider<T, A>(value: Provider<T, A>): value is TokenProvider<T, A>;
export function isTokenProvider<T, A>(value: unknown): value is TokenProvider<T, A>;
export function isTokenProvider<T, A>(value: unknown): value is TokenProvider<T, A> {
  return isObject(value) && (hasOwnProperty((value as TokenProvider), 'useToken') || hasOwnProperty((value as TokenProvider<T>), 'useTokenProvider'));
}

export function isFactoryProvider<T, A>(value: Provider<T, A>): value is FactoryProvider<T, A>;
export function isFactoryProvider<T, A>(value: unknown): value is FactoryProvider<T, A>;
export function isFactoryProvider<T, A>(value: unknown): value is FactoryProvider<T, A> {
  return isObject(value) && (hasOwnProperty((value as FactoryProvider<T, A>), 'useFactory'));
}

export function isProvider<T, A>(value: Provider<T, A>): value is Provider<T, A>;
export function isProvider<T, A>(value: unknown): value is Provider<T, A>;
export function isProvider<T, A>(value: unknown): value is Provider<T, A> {
  return isClassProvider(value) || isValueProvider(value) || isTokenProvider(value) || isFactoryProvider(value);
}

export function isProviderWithInitializer<T, A, C extends Record>(value: Provider<T, A, C>): value is Extract<Provider<T, A, C>, ProviderWithInitializer<T, A, C>> {
  return isFunction((value as ProviderWithInitializer<T, A, C>).afterResolve);
}
