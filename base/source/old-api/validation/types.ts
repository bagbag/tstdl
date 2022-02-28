import { ValidationError } from '#/error';
export { ValidationError };

export type SyncEndpointParametersValidator<Input, Output> = (object: Input) => ValidationResult<Output>;
export type AsyncEndpointParametersValidator<Input, Output> = (object: Input) => Promise<ValidationResult<Output>>;
export type EndpointParametersValidator<Input, Output> = SyncEndpointParametersValidator<Input, Output> | AsyncEndpointParametersValidator<Input, Output>;

export type ValidationResult<Output> = Output;
