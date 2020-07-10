import { EndpointParametersValidator } from './validation';

export type ApiEndpoint<Parameters, Result> = (parameters: Parameters) => Result | Promise<Result>;

export function createValidatedApiEndpoint<Parameters, ValidatedParameters, Result>(validator: EndpointParametersValidator<Parameters, ValidatedParameters>, handler: ApiEndpoint<ValidatedParameters, Result>): ApiEndpoint<Parameters, Result> {
  const endpoint: (parameters: Parameters) => Promise<Result> = async (parameters: Parameters) => {
    const validationResult = await validator(parameters);

    if (!validationResult.valid) {
      throw validationResult.error;
    }

    return handler(validationResult.value);
  };

  return endpoint;
}
