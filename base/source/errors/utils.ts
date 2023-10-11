export function unwrapError(error: any): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const wrappedError = error?.rejection ?? error?.reason ?? error?.error;

  if ((error instanceof Error) && !(error.message.startsWith('Uncaught') && (wrappedError instanceof Error))) {
    return error;
  }

  return wrappedError;
}
