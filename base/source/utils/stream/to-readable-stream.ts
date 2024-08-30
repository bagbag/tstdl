export function toReadableStream<T>(value: T): ReadableStream<T> {
  return new ReadableStream<T>({
    start(controller) {
      controller.enqueue(value);
      controller.close();
    }
  });
}
