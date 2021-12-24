import type { Constructor } from '#/types';
import { hasOwnProperty } from '#/utils/object';
import type { Container } from './container';

declare const parameter: unique symbol;

export type ParameterizedInjectionToken<T, P> = SimpleInjectionToken<T> & { [parameter]?: P };

export type SimpleInjectionToken<T> = Constructor<T> | Function | object | string | symbol;

export type InjectionToken<T = any, P = any> = SimpleInjectionToken<T> | ParameterizedInjectionToken<T, P>;

export type Factory<T, P = any> = (argument: P | undefined, container: Container) => T;

export type AsyncFactory<T, P = any> = (argument: P | undefined, container: Container) => Promise<T>;

export type Provider<T = any, P = any> =
  | ClassProvider<T>
  | ValueProvider<T>
  | TokenProvider<T, P>
  | FactoryProvider<T, P>
  | AsyncFactoryProvider<T, P>;

export type ClassProvider<T = any> = {
  useClass: Constructor<T>
};

export type ValueProvider<T = any> = {
  useValue: T
};

export type TokenProvider<T = any, P = any> =
  | {
    useToken: InjectionToken<T, P>,
    useTokenProvider?: undefined,
    argument?: P,
    argumentProvider?: () => P
  }
  | {
    useToken?: undefined,
    useTokenProvider: () => InjectionToken<T, P>,
    argument?: P,
    argumentProvider?: () => P
  };

export type FactoryProvider<T = any, P = unknown> = {
  useFactory: Factory<T, P>
};

export type AsyncFactoryProvider<T = any, P = unknown> = {
  useAsyncFactory: AsyncFactory<T, P>
};

export function injectionToken<T, P = any>(token: InjectionToken<T, P>): InjectionToken<T, P> {
  return token;
}

export function classProvider<T>(constructor: Constructor<T>): ClassProvider<T> {
  return { useClass: constructor };
}

export function valueProvider<T>(value: T): ValueProvider<T> {
  return { useValue: value };
}

export function tokenProvider<T, P>(token: InjectionToken<T, P>, argument?: P): TokenProvider<T> {
  return { useToken: token, argument };
}

export function factoryProvider<T, P>(factory: Factory<T, P>): FactoryProvider<T, P> {
  return { useFactory: factory };
}

export function asyncFactoryProvider<T, P>(factory: AsyncFactory<T, P>): AsyncFactoryProvider<T, P> {
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

export function isFactoryProvider<T, P>(provider: Provider<T, P>): provider is FactoryProvider<T, P> {
  return hasOwnProperty((provider as FactoryProvider<T, P>), 'useFactory');
}

export function isAsyncFactoryProvider<T, P>(provider: Provider<T, P>): provider is AsyncFactoryProvider<T, P> {
  return hasOwnProperty((provider as AsyncFactoryProvider<T, P>), 'useAsyncFactory');
}
