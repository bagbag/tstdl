import type { ResolveFn } from '@angular/router';
import type { Record } from '@tstdl/base/types';

export type RouteDataDefinition<T extends Record> = {
  [P in keyof T]: T[P] | ResolveFn<T>;
};

export function routeData<T extends Record>(definition: RouteDataDefinition<T>): RouteDataDefinition<T> {
  return definition;
}
