export class CustomError extends Error {
  readonly cause: Error | undefined;

  constructor({ name, message, cause }: { name?: string, message?: string, cause?: Error }) {
    const prototype = new.target.prototype;
    super(message);

    Object.setPrototypeOf(this, prototype);

    this.name = name ?? (new.target as unknown as CustomErrorStatic | undefined)?.errorName ?? new.target.name;
    this.cause = cause;
  }
}

export interface CustomErrorStatic {
  errorName: string;
}
