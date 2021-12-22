import type { Constructor } from '#/types';
import { isFunction, isString, isSymbol } from '#/utils';
import { hasOwnProperty } from '#/utils/object';
import type { Container } from './container';

export type InjectionToken<T = any> = Constructor<T> | string | symbol;

export type Factory<T> = (container: Container) => T;

export type AsyncFactory<T> = (container: Container) => Promise<T>;

export type Provider<T = any> =
  | ClassProvider<T>
  | ValueProvider<T>
  | TokenProvider<T>
  | FactoryProvider<T>
  | AsyncFactoryProvider<T>;

export type ClassProvider<T = any> = {
  useClass: Constructor<T>
};

export type ValueProvider<T = any> = {
  useValue: T
};

export type TokenProvider<T = any> = {
  useToken: InjectionToken<T>
};

export type FactoryProvider<T = any> = {
  useFactory: Factory<T>
};

export type AsyncFactoryProvider<T = any> = {
  useAsyncFactory: AsyncFactory<T>
};

export function injectionToken<T>(token: InjectionToken<T>): InjectionToken<T> {
  return token;
}

export function classProvider<T>(constructor: Constructor<T>): ClassProvider<T> {
  return { useClass: constructor };
}

export function valueProvider<T>(value: T): ValueProvider<T> {
  return { useValue: value };
}

export function tokenProvider<T>(token: InjectionToken<T>): TokenProvider<T> {
  return { useToken: token };
}

export function factoryProvider<T>(factory: Factory<T>): FactoryProvider<T> {
  return { useFactory: factory };
}

export function asyncFactoryProvider<T>(factory: AsyncFactory<T>): AsyncFactoryProvider<T> {
  return { useAsyncFactory: factory };
}

export function isConstructorInjectionToken<T>(token: InjectionToken<T>): token is Constructor<T> {
  return isFunction(token);
}

export function isStringInjectionToken<T>(token: InjectionToken<T>): token is string {
  return isString(token);
}

export function isSymbolInjectionToken<T>(token: InjectionToken<T>): token is symbol {
  return isSymbol(token);
}

export function isClassProvider<T>(provider: Provider<T>): provider is ClassProvider<T> {
  return hasOwnProperty((provider as ClassProvider<T>), 'useClass');
}

export function isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T> {
  return hasOwnProperty((provider as ValueProvider<T>), 'useValue');
}

export function isTokenProvider<T>(provider: Provider<T>): provider is TokenProvider<T> {
  return hasOwnProperty((provider as TokenProvider<T>), 'useToken');
}

export function isFactoryProvider<T>(provider: Provider<T>): provider is FactoryProvider<T> {
  return hasOwnProperty((provider as FactoryProvider<T>), 'useFactory');
}

export function isAsyncFactoryProvider<T>(provider: Provider<T>): provider is AsyncFactoryProvider<T> {
  return hasOwnProperty((provider as AsyncFactoryProvider<T>), 'useAsyncFactory');
}
