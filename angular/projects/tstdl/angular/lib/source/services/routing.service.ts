import type { Signal } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { NavigationExtras } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import type { Record } from '@tstdl/base/types';
import { assertStringPass, isNotNull, isNull } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { combineLatest, map } from 'rxjs';
import type { LiteralUnion } from 'type-fest';

export type GetParameterOptions = {
  optional?: boolean
};

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  protected readonly router = inject(Router);

  async navigateByUrl(url: string): Promise<void> {
    await this.router.navigateByUrl(url);
  }

  getParameter<T extends string>(parameter: string, options: GetParameterOptions & { optional: true }): Signal<LiteralUnion<T, string> | null>;
  getParameter<T extends string>(parameter: string, options?: GetParameterOptions): Signal<LiteralUnion<T, string>>;
  getParameter<T extends string>(parameter: string, options?: GetParameterOptions): Signal<LiteralUnion<T, string> | null> {
    return toSignal(this.getParameter$(parameter, options), { requireSync: true });
  }

  getParameter$<T extends string>(parameter: string, options: GetParameterOptions & { optional: true }): Observable<LiteralUnion<T, string> | null>;
  getParameter$<T extends string>(parameter: string, options?: GetParameterOptions): Observable<LiteralUnion<T, string>>;
  getParameter$<T extends string>(parameter: string, options?: GetParameterOptions): Observable<LiteralUnion<T, string> | null> {
    const observable = getParameterFromAll$(parameter);

    return (options?.optional == true)
      ? observable
      : observable.pipe(map((value) => assertStringPass(value, `Missing ${parameter} in route parameters.`)));
  }

  getParameters<T extends string>(parameter: string): Signal<LiteralUnion<T, string>[]> {
    return toSignal(this.getParameters$(parameter), { requireSync: true });
  }

  getParameters$<T extends string>(parameter: string): Observable<LiteralUnion<T, string>[]> {
    return getParametersFromAll$(parameter);
  }

  getQueryParameter<T extends string>(parameter: string): Signal<LiteralUnion<T, string> | null> {
    return toSignal(this.getQueryParameter$(parameter), { requireSync: true });
  }

  getQueryParameter$<T extends string>(parameter: string): Observable<LiteralUnion<T, string> | null> {
    return inject(ActivatedRoute).queryParamMap.pipe(map((value) => value.get(parameter)));
  }

  getQueryParameters<T extends string>(parameter: string): Signal<LiteralUnion<T, string>[]> {
    return toSignal(this.getQueryParameters$(parameter), { requireSync: true });
  }

  getQueryParameters$<T extends string>(parameter: string): Observable<LiteralUnion<T, string>[]> {
    return inject(ActivatedRoute).queryParamMap.pipe(map((value) => value.getAll(parameter)));
  }

  getFragmet(): Signal<string | null> {
    return toSignal(this.getFragmet$(), { requireSync: true });
  }

  getFragmet$(): Observable<string | null> {
    return inject(ActivatedRoute).fragment;
  }

  getData<T extends Record = Record>(): Signal<T> {
    return toSignal(this.getData$(), { requireSync: true });
  }

  getData$<T extends Record = Record>(): Observable<T> {
    return inject(ActivatedRoute).data as Observable<T>;
  }

  async setQueryParameter(key: string, value: string | null, options?: Pick<NavigationExtras, 'queryParamsHandling'>): Promise<void> {
    const route = inject(ActivatedRoute);

    await this.router.navigate([], {
      relativeTo: route,
      queryParams: {
        [key]: value
      },
      queryParamsHandling: options?.queryParamsHandling
    });
  }

  async setFragment(value: string | null): Promise<void> {
    const route = inject(ActivatedRoute);

    await this.router.navigate([], {
      relativeTo: route,
      fragment: value ?? ''
    });
  }
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
