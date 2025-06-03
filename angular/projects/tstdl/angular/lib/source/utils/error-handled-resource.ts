import { effect, ErrorHandler, inject, resource, type ResourceOptions, type ResourceRef } from '@angular/core';
import { isNotNullOrUndefined } from '@tstdl/base/utils';

/**
 * Wrapper for angulars {@link resource} which raises errors to {@link ErrorHandler}
 * @param options
 * @returns
 */
function errorHandledResource<T, R>(options: ResourceOptions<T, R> & { defaultValue: NoInfer<T> }): ResourceRef<T>;
function errorHandledResource<T, R>(options: ResourceOptions<T, R>): ResourceRef<T | undefined>;
function errorHandledResource<T, R>(options: ResourceOptions<T, R>): ResourceRef<T | undefined> {
  const errorHandler = inject(ErrorHandler);
  const resourceRef = resource(options);

  effect(() => {
    if (resourceRef.status() != 'error') {
      return;
    }

    const error = resourceRef.error();

    if (isNotNullOrUndefined(error)) {
      errorHandler.handleError(error);
    }
  }, { injector: options.injector });

  return resourceRef;
}

export { errorHandledResource as resource };
