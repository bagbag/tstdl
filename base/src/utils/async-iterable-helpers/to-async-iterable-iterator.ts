// eslint-disable-next-line @typescript-eslint/require-await
export async function* toAsyncIterableIterator<T>(iterable: Iterable<T>): AsyncIterableIterator<T> {
  yield* iterable;
}
