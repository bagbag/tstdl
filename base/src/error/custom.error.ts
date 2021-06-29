export class CustomError extends Error {
  constructor({ name, message }: { name?: string, message?: string }) {
    const prototype = new.target.prototype;
    super(message);

    Object.setPrototypeOf(this, prototype);

    this.name = name ?? (new.target as unknown as CustomErrorStatic | undefined)?.errorName ?? new.target.name;
  }
}

export interface CustomErrorStatic {
  errorName: string;
}
