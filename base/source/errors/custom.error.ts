
export type CustomErrorOptions = {
  /**
   * Name of error
   *
   * defaults to static {@link CustomErrorStatic.errorName} if set and constructor (class) name if unset.
   */
  name?: string,

  /**
   * Error message
   */
  message?: string,

  /**
   * Stack trace
   */
  stack?: string,

  /**
   * Cause for error
   */
  cause?: Error,

  /** Skip {@link Error} super call, which improves speed but looses stack trace */
  fast?: boolean | undefined
};

export abstract class CustomError extends Error {
  constructor(options: CustomErrorOptions = {}) {
    if (options.fast == true) {
      const errorObject = {};

      init(errorObject as Error, new.target as unknown as CustomErrorStatic, options);

      // eslint-disable-next-line no-constructor-return
      return errorObject as CustomError;
    }

    const errorOptions: ErrorOptions = {};

    if (options.cause != undefined) {
      errorOptions.cause = options.cause;
    }

    super(options.message, errorOptions);

    init(this, new.target as unknown as CustomErrorStatic, options);
  }
}

function init(instance: Error, target: CustomErrorStatic, { name, message, stack, cause, fast }: CustomErrorOptions): void {
  instance.message = (instance.message as string | undefined) ?? message ?? 'No error message provided.';
  instance.name = name ?? (target as CustomErrorStatic | undefined)?.errorName ?? (target.prototype as CustomErrorStatic).name;

  if (stack != undefined) {
    instance.stack = stack;
  }

  if ((cause != undefined) && (instance.cause == undefined)) {
    instance.cause = cause;
  }

  if (fast == true) {
    Object.setPrototypeOf(instance, (target.prototype as CustomErrorStatic));
  }
}

export interface CustomErrorStatic<T extends CustomError = CustomError> {
  readonly errorName: string;

  new(...args: any[]): T;
}
