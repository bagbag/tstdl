import type { Constructor } from '#/types';
import { hasOwnProperty } from '#/utils/object/object';
import type { InjectableArgument } from './interfaces';
import type { InjectionToken } from './token';
import type { ResolveContext } from './types';

export type Factory<T, A = any> = (argument: InjectableArgument<T, A> | undefined, context: ResolveContext) => T;

export type AsyncFactory<T, A = any> = (argument: InjectableArgument<T, A> | undefined, context: ResolveContext) => Promise<T>;

export type Provider<T = any, A = any> =
  | ClassProvider<T>
  | ValueProvider<T>
  | TokenProvider<T, A>
  | FactoryProvider<T, A>
  | AsyncFactoryProvider<T, A>;

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
    argumentProvider?: () => InjectableArgument<T, A>
  }
  | {
    useToken?: undefined,
    useTokenProvider: () => InjectionToken<T, A>,
    argument?: InjectableArgument<T, A>,
    argumentProvider?: () => InjectableArgument<T, A>
  };

export type FactoryProvider<T = any, A = unknown> = {
  useFactory: Factory<T, A>
};

export type AsyncFactoryProvider<T = any, A = unknown> = {
  useAsyncFactory: AsyncFactory<T, A>
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

export function asyncFactoryProvider<T, A>(factory: AsyncFactory<T, A>): AsyncFactoryProvider<T, A> {
  return { useAsyncFactory: factory };
}

export function isClassProvider<T>(provider: Provider<T>): provider is ClassProvider<T> {
  return hasOwnProperty((provider as ClassProvider<T>), 'useClass');
}

export function isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T> {
  return hasOwnProperty((provider as ValueProvider<T>), 'useValue');
}

export function isTokenProvider<T>(provider: Provider<T>): provider is TokenProvider<T> {
  return hasOwnProperty((provider as TokenProvider<T>), 'useToken') || hasOwnProperty((provider as TokenProvider<T>), 'useTokenProvider');
}

export function isFactoryProvider<T, A>(provider: Provider<T, A>): provider is FactoryProvider<T, A> {
  return hasOwnProperty((provider as FactoryProvider<T, A>), 'useFactory');
}

export function isAsyncFactoryProvider<T, A>(provider: Provider<T, A>): provider is AsyncFactoryProvider<T, A> {
  return hasOwnProperty((provider as AsyncFactoryProvider<T, A>), 'useAsyncFactory');
}