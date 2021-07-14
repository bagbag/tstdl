export type CancelablePromiseResult<T> =
  | { canceled: true }
  | { canceled: false, value: T };

// eslint-disable-next-line @typescript-eslint/promise-function-async
export function cancelablePromise<T>(promise: Promise<T>, cancelationPromise: PromiseLike<void>): Promise<CancelablePromiseResult<T>> {
  return new Promise<CancelablePromiseResult<T>>((resolve, reject) => {
    let pending = true;

    const pendingResolve = (result: CancelablePromiseResult<T>): void => {
      if (pending) {
        resolve(result);
        pending = false;
      }
    };

    const pendingReject = (reason: any): void => {
      if (pending) {
        reject(reason);
        pending = false;
      }
    };

    promise
      .then((value) => pendingResolve({ canceled: false, value }))
      .catch(pendingReject);

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    cancelationPromise
      .then(() => pendingResolve({ canceled: true }));
  });
}
