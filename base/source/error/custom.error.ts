export type CustomErrorOptions = {
  /**
   * name of error
   *
   * defaults to static {@link CustomErrorStatic.errorName} if set and constructor (class) name if unset.
   */
  name?: string,

  /**
   * error message
   */
  message?: string,

  /**
   * cause for error
   */
  cause?: Error,

  /** skip {@link Error} super call, which improves speed but looses stack trace */
  fast?: boolean
};

export class CustomError extends Error {
  constructor(options: CustomErrorOptions) {
    if (options.fast == true) {
      const errorObject = {};

      init(errorObject as Error, new.target.prototype, options);

      // eslint-disable-next-line no-constructor-return
      return errorObject as CustomError;
    }

    super(options.message, { cause: options.cause });

    init(this, new.target.prototype, options);
  }
}

function init(instance: Error, prototype: CustomError, { name, message, cause, fast }: CustomErrorOptions): void {
  instance.message = (instance.message as string | undefined) ?? message ?? 'No error message provided.';
  instance.name = name ?? (new.target as unknown as CustomErrorStatic | undefined)?.errorName ?? prototype.name;

  if ((cause != undefined) && (instance.cause == undefined)) {
    instance.cause = cause;
  }

  if (fast == true) {
    Object.setPrototypeOf(instance, prototype);
  }
}

export interface CustomErrorStatic<T extends CustomError = CustomError> {
  readonly errorName: string;

  new(...args: any[]): T;
}
