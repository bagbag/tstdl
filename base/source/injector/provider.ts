import type { Constructor, Record, TypedOmit } from '#/types.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import { isFunction, isObject } from '#/utils/type-guards.js';
import type { ResolveArgument } from './interfaces.js';
import type { InjectionToken } from './token.js';
import type { ResolveContext } from './types.js';

export type Factory<T, A = any, C extends Record = Record> = (argument: ResolveArgument<T, A>, context: ResolveContext<C>) => T;

export type ProviderWithArgument<T, A> = { defaultArgument?: ResolveArgument<T, A>, defaultArgumentProvider?: () => ResolveArgument<T, A> };

export type ProviderWithInitializer<T, A, C extends Record> = { afterResolve?: (value: T, argument: A, context: C) => void | Promise<void> };

export type Provider<T = any, A = any, C extends Record = Record> =
  | ClassProvider<T, A, C>
  | ValueProvider<T>
  | TokenProvider<T, A, C>
  | FactoryProvider<T, A, C>;

export type ClassProvider<T = any, A = any, C extends Record = Record> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A, C> & {
  useClass: Constructor<T>
};

export type ValueProvider<T = any> = {
  useValue: T
};

export type TokenProvider<T = any, A = any, C extends Record = Record> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A, C> & (
  | { useToken: InjectionToken<T, A>, useTokenProvider?: undefined }
  | { useToken?: undefined, useTokenProvider: () => InjectionToken<T, A> }
) & {
  /**
   * whether to resolve all providers registered for the token
   */
  resolveAll?: boolean
};

export type FactoryProvider<T = any, A = unknown, C extends Record = Record> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A, C> & {
  useFactory: Factory<T, A, C>
};

export function classProvider<T, A, C extends Record>(constructor: Constructor<T>, options?: TypedOmit<ClassProvider<T, A, C>, 'useClass'>): ClassProvider<T, A, C> {
  return { useClass: constructor, ...options };
}

export function valueProvider<T>(value: T, options?: TypedOmit<ValueProvider<T>, 'useValue'>): ValueProvider<T> {
  return { useValue: value, ...options };
}

export function tokenProvider<T, A, C extends Record>(token: InjectionToken<T, A>, options?: TypedOmit<TokenProvider<T, A, C>, 'useToken' | 'useTokenProvider'>): TokenProvider<T> {
  return { useToken: token, ...options };
}

export function factoryProvider<T, A, C extends Record>(factory: Factory<T, A, C>, options?: TypedOmit<FactoryProvider<T, A, C>, 'useFactory'>): FactoryProvider<T, A, C> {
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
