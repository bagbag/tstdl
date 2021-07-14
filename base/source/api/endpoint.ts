import type { EndpointParametersValidator } from './validation';

export type ApiEndpoint<Parameters, Result, Context = unknown> = (parameters: Parameters, context: Context) => Result | Promise<Result>;
export type ParametersTransformer<Parameters, UpdatedParameters> = (parameters: Parameters) => UpdatedParameters | Promise<UpdatedParameters>;

export function createValidatedApiEndpoint<Parameters, ValidatedParameters, Result, Context>(validator: EndpointParametersValidator<Parameters, ValidatedParameters>, handler: ApiEndpoint<ValidatedParameters, Result, Context>): ApiEndpoint<Parameters, Result, Context> {
  async function validationApiEndpoint(parameters: Parameters, context: Context): Promise<Result> {
    const validatedValue = await validator(parameters);
    return handler(validatedValue, context);
  }

  return validationApiEndpoint;
}

export function createTransformedApiEndpoint<Parameters, TransformedParameters, Result, Context>(transformer: ParametersTransformer<Parameters, TransformedParameters>, handler: ApiEndpoint<TransformedParameters, Result, Context>): ApiEndpoint<Parameters, Result, Context> {
  async function transformedApiEndpoint(parameters: Parameters, context: Context): Promise<Result> {
    const transformedParameters = await transformer(parameters);
    return handler(transformedParameters, context);
  }

  return transformedApiEndpoint;
}
