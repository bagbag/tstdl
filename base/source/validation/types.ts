export type SyncValidator<Input, Output> = (object: Input) => ValidationResult<Output>;
export type AsyncValidator<Input, Output> = (object: Input) => Promise<ValidationResult<Output>>;
export type Validator<Input, Output> = SyncValidator<Input, Output> | AsyncValidator<Input, Output>;

export type ValidationResult<Output> = Output;
