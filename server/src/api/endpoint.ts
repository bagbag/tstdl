import type { EndpointParametersValidator } from './validation';

export type ApiEndpoint<Parameters, Result, Context = unknown> = (parameters: Parameters, context: Context) => Result | Promise<Result>;
export type ParametersUpdater<Parameters, UpdatedParameters> = (parameters: Parameters) => UpdatedParameters | Promise<UpdatedParameters>;

export function createValidatedApiEndpoint<Parameters, ValidatedParameters, Result, Context>(validator: EndpointParametersValidator<Parameters, ValidatedParameters>, handler: ApiEndpoint<ValidatedParameters, Result, Context>): ApiEndpoint<Parameters, Result, Context> {
  async function validationApiEndpoint(parameters: Parameters, context: Context): Promise<Result> {
    const validationResult = await validator(parameters);

    if (!validationResult.valid) {
      throw validationResult.error;
    }

    return handler(validationResult.value, context);
  }

  return validationApiEndpoint;
}

export function createTransformedApiEndpoint<Parameters, UpdatedParameters, Result, Context>(updater: ParametersUpdater<Parameters, UpdatedParameters>, handler: ApiEndpoint<UpdatedParameters, Result, Context>): ApiEndpoint<Parameters, Result, Context> {
  async function transformApiEndpoint(parameters: Parameters, context: Context): Promise<Result> {
    const updatedParameters = await updater(parameters);
    return handler(updatedParameters, context);
  }

  return transformApiEndpoint;
}
