import { effect, ErrorHandler, inject, resource, ResourceStatus, type ResourceOptions, type ResourceRef } from '@angular/core';
import { isNotNullOrUndefined } from '@tstdl/base/utils';

/**
 * Wrapper for angulars {@link resource} which raises errors to {@link ErrorHandler}
 * @param options
 * @returns
 */
function errorHandledResource<T, R>(options: ResourceOptions<T, R>): ResourceRef<T | undefined> {
  const errorHandler = inject(ErrorHandler);
  const ref = resource(options);

  effect(() => {
    if (ref.status() != ResourceStatus.Error) {
      return;
    }

    const error = ref.error();

    if (isNotNullOrUndefined(error)) {
      errorHandler.handleError(error);
    }
  }, { injector: options.injector });

  return ref;
}

export { errorHandledResource as resource };
