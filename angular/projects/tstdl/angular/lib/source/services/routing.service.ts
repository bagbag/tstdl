import type { Signal, WritableSignal } from '@angular/core';
import { effect, ErrorHandler, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { NavigationExtras } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import type { Record, SimplifiedLiteralUnion, TypedOmit } from '@tstdl/base/types';
import { assertStringPass, isArray, isDefined, isFunction, isNotFunction, isNotNull, isNull } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';

export type TransformOptions<T extends string | string[] | null, TTransform> = {
  transform?: ((value: T) => TTransform) | {
    fromString: (value: T) => TTransform,
    toString?: (value: TTransform) => T
  }
};

type WithTransformOptions<T extends string | string[] | null, TTransform> = Required<TransformOptions<T, TTransform>>;

type WithoutTransformOptions = TypedOmit<TransformOptions<string, undefined>, 'transform'> & { transform?: undefined };

export type InjectParameterOptions = {
  optional?: boolean
};

export class RoutingService {
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  async setQueryParameter(key: string, value: string | string[] | null): Promise<void> {
    await this.setQueryParameters({ [key]: value });
  }

  async setQueryParameters(parameters: Record<string, string | string[] | null>, options?: Pick<NavigationExtras, 'queryParamsHandling'>): Promise<void> {
    await this.router.navigate([], {
      queryParams: parameters,
      queryParamsHandling: options?.queryParamsHandling ?? 'merge',
    });
  }

  async setFragment(value: string | null): Promise<void> {
    await this.router.navigate([], {
      fragment: value ?? '',
      queryParamsHandling: 'preserve',
    });
  }
}

export function injectRoutingService(): RoutingService {
  return new RoutingService();
}

export function injectParameter<T extends string>(parameter: string, options: InjectParameterOptions & { optional: true }): Signal<SimplifiedLiteralUnion<T> | null>;
export function injectParameter<T extends string>(parameter: string, options?: InjectParameterOptions & { optional?: false }): Signal<SimplifiedLiteralUnion<T>>;
export function injectParameter(parameter: string, options?: InjectParameterOptions): Signal<string | null> {
  return toSignal(injectParameter$(parameter, options), { requireSync: true });
}

export function injectParameter$<T extends string>(parameter: string, options: InjectParameterOptions & { optional: true }): Observable<SimplifiedLiteralUnion<T> | null>;
export function injectParameter$<T extends string>(parameter: string, options?: InjectParameterOptions & { optional?: false }): Observable<SimplifiedLiteralUnion<T>>;
export function injectParameter$<T extends string>(parameter: string, options?: InjectParameterOptions): Observable<SimplifiedLiteralUnion<T> | null>;
export function injectParameter$<T extends string>(parameter: string, options?: InjectParameterOptions): Observable<SimplifiedLiteralUnion<T> | null> {
  const observable = getParameterFromAll$(parameter);

  const result = (options?.optional == true)
    ? observable
    : observable.pipe(map((value) => assertStringPass(value, `Missing ${parameter} in route parameters.`)));

  return result as Observable<SimplifiedLiteralUnion<T> | null>;
}

export function injectParameters<T extends string>(parameter: string): Signal<SimplifiedLiteralUnion<T>[]> {
  return toSignal(injectParameters$(parameter), { requireSync: true });
}

export function injectParameters$<T extends string>(parameter: string): Observable<SimplifiedLiteralUnion<T>[]> {
  return getParametersFromAll$(parameter) as Observable<SimplifiedLiteralUnion<T>[]>;
}

export function injectQueryParameter<T extends string, TTransform>(parameter: string, options: WithTransformOptions<SimplifiedLiteralUnion<T> | null, TTransform>): WritableSignal<TTransform>;
export function injectQueryParameter<T extends string>(parameter: string, options?: WithoutTransformOptions): WritableSignal<SimplifiedLiteralUnion<T> | null>;
export function injectQueryParameter<TTransform>(parameter: string, options?: TransformOptions<string | null, TTransform>): WritableSignal<string | TTransform | null> {
  const routingService = injectRoutingService();
  const errorHandler = inject(ErrorHandler);

  const transformFromString = isFunction(options?.transform) ? options.transform : options?.transform?.fromString;
  const transformToString = ((isDefined(options?.transform) && isNotFunction(options.transform)) ? options.transform.toString : undefined) ?? ((value: any) => isNull(value) ? null : String(value));
  const parameterSignal = toSignal(injectQueryParameter$(parameter), { requireSync: true });
  const signal = linkedSignal<string | TTransform | null>(isDefined(transformFromString) ? () => transformFromString(parameterSignal()) : parameterSignal);

  if (isNotNull(routingService.route)) {
    effect(() => {
      void routingService.setQueryParameter(parameter, transformToString(signal() as TTransform)).catch((error) => errorHandler.handleError(error));
    });
  }

  return signal;
}

export function injectQueryParameter$<T extends string>(parameter: string): Observable<SimplifiedLiteralUnion<T> | null> {
  return inject(ActivatedRoute).queryParamMap.pipe(map((value) => value.get(parameter) as SimplifiedLiteralUnion<T> | null));
}

export function injectQueryParameters<T extends string, TTransform>(parameter: string, options: WithTransformOptions<SimplifiedLiteralUnion<T>[], TTransform>): WritableSignal<TTransform>;
export function injectQueryParameters<T extends string>(parameter: string, options?: WithoutTransformOptions): WritableSignal<SimplifiedLiteralUnion<T>[]>;
export function injectQueryParameters<TTransform>(parameter: string, options?: TransformOptions<string[], TTransform>): WritableSignal<string[] | TTransform> {
  const routingService = injectRoutingService();
  const errorHandler = inject(ErrorHandler);

  const transformFromString = isFunction(options?.transform) ? options.transform : options?.transform?.fromString;
  const transformToString = ((isDefined(options?.transform) && isNotFunction(options.transform)) ? options.transform.toString : undefined) ?? ((value: any) => isArray(value) ? value.map(String) : isNull(value) ? null : String(value));
  const parameterSignal = toSignal(injectQueryParameters$(parameter), { requireSync: true });
  const signal = linkedSignal<string[] | TTransform>(isDefined(transformFromString) ? () => transformFromString(parameterSignal()) : parameterSignal);

  if (isNotNull(routingService.route)) {
    effect(() => {
      const value = signal();
      void routingService.setQueryParameter(parameter, isArray(value) ? value.map(String) : transformToString(value)).catch((error) => errorHandler.handleError(error));
    });
  }

  return signal;
}

export function injectQueryParameters$<T extends string>(parameter: string): Observable<SimplifiedLiteralUnion<T>[]> {
  return inject(ActivatedRoute).queryParamMap.pipe(map((value) => value.getAll(parameter) as SimplifiedLiteralUnion<T>[]));
}

export function injectFragmet(): WritableSignal<string | null> {
  const routingService = injectRoutingService();
  const errorHandler = inject(ErrorHandler);

  const parameterSignal = toSignal(injectFragmet$(), { requireSync: true });
  const signal = linkedSignal(parameterSignal);

  effect(() => void routingService.setFragment(signal()).catch((error) => errorHandler.handleError(error)));

  return signal;
}

export function injectFragmet$(): Observable<string | null> {
  return inject(ActivatedRoute).fragment;
}

export function injectRouteData<T extends Record = Record>(): Signal<T> {
  return toSignal(injectRouteData$(), { requireSync: true });
}

export function injectRouteData$<T extends Record = Record>(): Observable<T> {
  return inject(ActivatedRoute).data as Observable<T>;
}

function getParameterFromAll$(parameter: string, route: ActivatedRoute = inject(ActivatedRoute)): Observable<string | null> {
  const path = getRoutePath(route);
  const paramMaps = path.map((r) => r.paramMap);

  return combineLatest(paramMaps).pipe(
    map((maps) => {
      for (const paramMap of maps) {
        const value = paramMap.get(parameter);

        if (isNotNull(value)) {
          return value;
        }
      }

      return null;
    })
  );
}

function getParametersFromAll$(parameter: string, route: ActivatedRoute = inject(ActivatedRoute)): Observable<string[]> {
  const path = getRoutePath(route);
  const paramMaps = path.map((r) => r.paramMap);

  return combineLatest(paramMaps).pipe(
    map((maps) => {
      for (const paramMap of maps) {
        const values = paramMap.getAll(parameter);

        if (values.length > 0) {
          return values;
        }
      }

      return [];
    })
  );
}

function getRoutePath(route: ActivatedRoute): ActivatedRoute[] {
  const routes = [route];

  while (true) {
    const currentRoute = routes.at(-1)!;

    if (isNull(currentRoute.parent)) {
      return routes;
    }

    routes.push(currentRoute.parent);
  }
}
