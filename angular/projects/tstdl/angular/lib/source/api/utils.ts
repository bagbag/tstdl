import { inject } from '@angular/core';
import type { ApiDefinition } from '@tstdl/base/api';
import { compileClient, type ApiClient } from '@tstdl/base/api/client';
import { HttpClient } from '@tstdl/base/http';

export function getApiService<T extends ApiDefinition>(baseName: string, apiDefinition: T): ApiClient<T> {
  const className = `${baseName}ApiServiceBase`;

  const klass = {
    [className]: class extends (compileClient(apiDefinition) as any) {
      constructor() {
        super(inject(HttpClient));
      }
    },
  }[className]!;

  return klass as ApiClient<T>;
}
