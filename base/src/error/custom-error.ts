export class CustomError extends Error {
  readonly name: string;

  constructor({ name, message }: { name?: string, message?: string }) {
    const prototype = new.target.prototype;
    super(message);

    Object.setPrototypeOf(this, prototype);

    this.name = (name == undefined)
      ? new.target.name
      : name;
  }
}
