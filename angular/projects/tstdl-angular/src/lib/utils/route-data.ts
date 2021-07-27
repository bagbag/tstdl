import type { Resolve } from '@angular/router';
import type { StringMap, Type } from '@tstdl/base/esm/types';

export type RouteDataDefinition<T extends StringMap> = {
  [P in keyof T]: T[P] | Type<Resolve<T[P]>>
};

export function routeData<T extends StringMap>(definition: RouteDataDefinition<T>): RouteDataDefinition<T> {
  return definition;
}
