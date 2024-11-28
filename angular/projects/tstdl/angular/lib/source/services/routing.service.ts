import type { Signal } from '@angular/core';
import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { NavigationExtras } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import type { If, Record } from '@tstdl/base/types';
import { assertStringPass, isNotNull, isNull } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';
import type { IsEqual, LiteralUnion } from 'type-fest';

export type GetParameterOptions = {
  optional?: boolean
};

export class RoutingService {
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute, { optional: true });

  async setQueryParameter(key: string, value: string | null, options?: Pick<NavigationExtras, 'queryParamsHandling'>): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        [key]: value
      },
      queryParamsHandling: options?.queryParamsHandling
    });
  }

  async setFragment(value: string | null): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      fragment: value ?? ''
    });
  }
}

export function injectRoutingService(): RoutingService {
  return new RoutingService();
}

export function injectParameter<T extends string>(parameter: string, options: GetParameterOptions & { optional: true }): Signal<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null>;
export function injectParameter<T extends string>(parameter: string, options?: GetParameterOptions): Signal<If<IsEqual<T, string>, T, LiteralUnion<T, string>>>;
export function injectParameter<T extends string>(parameter: string, options?: GetParameterOptions): Signal<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null> {
  return toSignal(injectParameter$(parameter, options), { requireSync: true }) as Signal<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null>;
}

export function injectParameter$<T extends string>(parameter: string, options: GetParameterOptions & { optional: true }): Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null>;
export function injectParameter$<T extends string>(parameter: string, options?: GetParameterOptions): Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>>>;
export function injectParameter$<T extends string>(parameter: string, options?: GetParameterOptions): Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null> {
  const observable = getParameterFromAll$(parameter);

  const result = (options?.optional == true)
    ? observable
    : observable.pipe(map((value) => assertStringPass(value, `Missing ${parameter} in route parameters.`)));

  return result as Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null>;
}

export function injectParameters<T extends string>(parameter: string): Signal<If<IsEqual<T, string>, T, LiteralUnion<T, string>>[]> {
  return toSignal(injectParameters$(parameter), { requireSync: true });
}

export function injectParameters$<T extends string>(parameter: string): Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>>[]> {
  return getParametersFromAll$(parameter) as Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>>[]>;
}

export function injectQueryParameter<T extends string>(parameter: string): Signal<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null> {
  return toSignal(injectQueryParameter$(parameter), { requireSync: true });
}

export function injectQueryParameter$<T extends string>(parameter: string): Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null> {
  return inject(ActivatedRoute).queryParamMap.pipe(map((value) => value.get(parameter) as If<IsEqual<T, string>, T, LiteralUnion<T, string>> | null));
}

export function injectQueryParameters<T extends string>(parameter: string): Signal<If<IsEqual<T, string>, T, LiteralUnion<T, string>>[]> {
  return toSignal(injectQueryParameters$(parameter), { requireSync: true });
}

export function injectQueryParameters$<T extends string>(parameter: string): Observable<If<IsEqual<T, string>, T, LiteralUnion<T, string>>[]> {
  return inject(ActivatedRoute).queryParamMap.pipe(map((value) => value.getAll(parameter) as If<IsEqual<T, string>, T, LiteralUnion<T, string>>[]));
}

export function injectFragmet(): Signal<string | null> {
  return toSignal(injectFragmet$(), { requireSync: true });
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
