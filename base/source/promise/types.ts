export type PromiseExecutor<T> = ConstructorParameters<typeof Promise<T>>[0];
export type PromiseResolveFunction<T> = (value: T | PromiseLike<T>) => void;
export type PromiseRejectFunction = (reason?: any) => void;
