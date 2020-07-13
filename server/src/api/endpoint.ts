import { EndpointParametersValidator } from './validation';

export type ApiEndpoint<Parameters, Result, Context = unknown> = (parameters: Parameters, context: Context) => Result | Promise<Result>;

export function createValidatedApiEndpoint<Parameters, ValidatedParameters, Result, Context>(validator: EndpointParametersValidator<Parameters, ValidatedParameters>, handler: ApiEndpoint<ValidatedParameters, Result, Context>): ApiEndpoint<Parameters, Result, Context> {
  const endpoint: (parameters: Parameters, context: Context) => Promise<Result> = async (parameters: Parameters, context: Context) => {
    const validationResult = await validator(parameters);

    if (!validationResult.valid) {
      throw validationResult.error;
    }

    return handler(validationResult.value, context);
  };

  return endpoint;
}
