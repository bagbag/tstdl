import { EndpointValidator } from './validation';
import { noopValidator } from './validation/validators';

export type EndpointHandler<Parameters, Result> = (parameters: Parameters) => Result | Promise<Result>;

export type ApiEndpoint<Parameters, Result> = EndpointHandler<Parameters, Result>;

export function createApiEndpoint<Parameters, Result>(handler: EndpointHandler<Parameters, Result>): EndpointHandler<Parameters, Result>;
export function createApiEndpoint<Parameters, ValidatedParameters, Result>(handler: EndpointHandler<ValidatedParameters, Result>, validator: EndpointValidator<Parameters, ValidatedParameters>): EndpointHandler<Parameters, Result>;
export function createApiEndpoint<Parameters, ValidatedParameters, Result>(handler: EndpointHandler<ValidatedParameters, Result>, validator?: EndpointValidator<Parameters, ValidatedParameters>): EndpointHandler<Parameters, Result> {
  const endpoint: (parameters: Parameters) => Promise<Result> = async (parameters: Parameters) => {
    const validationResult = await validator?.(parameters) ?? noopValidator(parameters);

    if (!validationResult.valid) {
      throw validationResult.error;
    }

    return handler(validationResult.value as ValidatedParameters);
  };

  return endpoint;
}
