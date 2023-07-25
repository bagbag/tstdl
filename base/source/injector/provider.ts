import type { Constructor, TypedOmit } from '#/types.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import { isFunction, isObject } from '#/utils/type-guards.js';
import type { ResolveArgument } from './interfaces.js';
import type { InjectionToken } from './token.js';
import type { ResolveContext } from './types.js';

export type Factory<T, A = any> = (argument: ResolveArgument<T, A>, context: ResolveContext) => T;

export type ProviderWithArgument<T, A> = { defaultArgument?: ResolveArgument<T, A>, defaultArgumentProvider?: () => ResolveArgument<T, A> };

export type ProviderWithInitializer<T, A> = { afterResolve?: (value: T, argument: A) => void | Promise<void> };

export type Provider<T = any, A = any> =
  | ClassProvider<T>
  | ValueProvider<T>
  | TokenProvider<T, A>
  | FactoryProvider<T, A>;

export type ClassProvider<T = any, A = any> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A> & {
  useClass: Constructor<T>
};

export type ValueProvider<T = any> = {
  useValue: T
};

export type TokenProvider<T = any, A = any> = ProviderWithArgument<T, A> & ProviderWithInitializer<T, A> & (
  | { useToken: InjectionToken<T, A>, useTokenProvider?: undefined }
  | { useToken?: undefined, useTokenProvider: () => InjectionToken<T, A> }
);

export type FactoryProvider<T = any, A = unknown> = {
  useFactory: Factory<T, A>
};

export function classProvider<T, A>(constructor: Constructor<T>, options?: TypedOmit<ClassProvider<T, A>, 'useClass'>): ClassProvider<T, A> {
  return { useClass: constructor, ...options };
}

export function valueProvider<T>(value: T, options?: TypedOmit<ValueProvider<T>, 'useValue'>): ValueProvider<T> {
  return { useValue: value, ...options };
}

export function tokenProvider<T, A>(token: InjectionToken<T, A>, options?: TypedOmit<TokenProvider<T>, 'useToken' | 'useTokenProvider'>): TokenProvider<T> {
  return { useToken: token, ...options };
}

export function factoryProvider<T, A>(factory: Factory<T, A>, options?: TypedOmit<FactoryProvider<T, A>, 'useFactory'>): FactoryProvider<T, A> {
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

export function isProviderWithInitializer<T, A>(value: Provider<T, A>): value is Extract<Provider<T, A>, ProviderWithInitializer<T, A>> {
  return isFunction((value as ProviderWithInitializer<T, A>).afterResolve);
}
