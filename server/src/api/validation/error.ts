export class ValidationError extends Error {
  readonly details: any;

  constructor(name: string, message: string, details?: any) {
    super(message);

    this.name = name;
    this.details = details;
  }
}
