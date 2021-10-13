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
  cause?: Error
};

export class CustomError extends Error {
  readonly cause: Error | undefined;

  constructor({ name, message, cause }: CustomErrorOptions) {
    const prototype = new.target.prototype;
    super(message);

    Object.setPrototypeOf(this, prototype);

    this.name = name ?? (new.target as unknown as CustomErrorStatic | undefined)?.errorName ?? new.target.name;

    if (cause != undefined) {
      this.cause = cause;
    }
  }
}

export interface CustomErrorStatic<T extends CustomError = CustomError> {
  readonly errorName: string;

  new(...args: any[]): T;
}
