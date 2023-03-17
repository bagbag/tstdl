import type { Constructor } from '#/types.js';
import { hasOwnProperty } from '#/utils/object/object.js';
import { isObject } from '#/utils/type-guards.js';
import type { InjectableArgument } from './interfaces.js';
import type { InjectionToken } from './token.js';
import type { ResolveContext } from './types.js';

export type Factory<T, A = any> = (argument: InjectableArgument<T, A> | undefined, context: ResolveContext) => T | Promise<T>;

export type Provider<T = any, A = any> =
  | ClassProvider<T>
  | ValueProvider<T>
  | TokenProvider<T, A>
  | FactoryProvider<T, A>;

export type ClassProvider<T = any> = {
  useClass: Constructor<T>
};

export type ValueProvider<T = any> = {
  useValue: T
};

export type TokenProvider<T = any, A = any> =
  | {
    useToken: InjectionToken<T, A>,
    useTokenProvider?: undefined,
    argument?: InjectableArgument<T, A>,
    argumentProvider?: () => InjectableArgument<T, A> | Promise<InjectableArgument<T, A>>
  }
  | {
    useToken?: undefined,
    useTokenProvider: () => InjectionToken<T, A> | Promise<InjectionToken<T, A>>,
    argument?: InjectableArgument<T, A>,
    argumentProvider?: () => InjectableArgument<T, A> | Promise<InjectableArgument<T, A>>
  };

export type FactoryProvider<T = any, A = unknown> = {
  useFactory: Factory<T, A>
};

export function classProvider<T>(constructor: Constructor<T>): ClassProvider<T> {
  return { useClass: constructor };
}

export function valueProvider<T>(value: T): ValueProvider<T> {
  return { useValue: value };
}

export function tokenProvider<T, A>(token: InjectionToken<T, A>, argument?: InjectableArgument<T, A>): TokenProvider<T> {
  return { useToken: token, argument };
}

export function factoryProvider<T, A>(factory: Factory<T, A>): FactoryProvider<T, A> {
  return { useFactory: factory };
}

export function isClassProvider<T>(value: unknown): value is ClassProvider<T> {
  return isObject(value) && hasOwnProperty((value as ClassProvider), 'useClass');
}

export function isValueProvider<T>(value: unknown): value is ValueProvider<T> {
  return isObject(value) && hasOwnProperty((value as ValueProvider), 'useValue');
}

export function isTokenProvider<T>(value: unknown): value is TokenProvider<T> {
  return isObject(value) && (hasOwnProperty((value as TokenProvider), 'useToken') || hasOwnProperty((value as TokenProvider<T>), 'useTokenProvider'));
}

export function isFactoryProvider<T, A>(value: unknown): value is FactoryProvider<T, A> {
  return isObject(value) && hasOwnProperty((value as FactoryProvider<T, A>), 'useFactory');
}

export function isProvider<T, A>(value: unknown): value is Provider<T, A> {
  return isObject(value) && (isClassProvider(value) || isValueProvider(value) || isTokenProvider(value) || isFactoryProvider(value));
}
