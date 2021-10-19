export type ComposedMiddlerware<TIn, TOut> = (value: TIn) => TOut;
export type MiddlerwareHandler<TIn, TOut> = (value: TIn) => TOut;
export type Middleware<TIn, TOut> = (value: TIn, next: MiddlerwareHandler<TIn, TOut>) => TOut | TOut;

export type ComposedAsyncMiddlerware<TIn, TOut> = (value: TIn) => Promise<TOut>;
export type AsyncMiddlerwareHandler<TIn, TOut> = (value: TIn) => TOut | Promise<TOut>;
export type AsyncMiddleware<TIn, TOut> = (value: TIn, next: AsyncMiddlerwareHandler<TIn, TOut>) => TOut | Promise<TOut>;

export type MiddlewareOptions = {
  allowMultipleNextCalls?: boolean
};

export function composeMiddleware<TIn, TOut>(middlewares: Middleware<TIn, TOut>[], handler: MiddlerwareHandler<TIn, TOut>, options: MiddlewareOptions = {}): ComposedMiddlerware<TIn, TOut> {
  function composedMiddleware(value: TIn): TOut {
    let currentIndex = -1;

    function dispatch(index: number, dispatchedValue: TIn): TOut {
      if (index == middlewares.length) {
        return handler(dispatchedValue);
      }

      const middleware = middlewares[index]!;
      currentIndex = index;

      function next(nextValue: TIn): TOut {
        if ((index < currentIndex) && (options.allowMultipleNextCalls != true)) {
          throw new Error('next() called multiple times');
        }

        return dispatch(index + 1, nextValue);
      }

      return middleware(dispatchedValue, next);
    }

    return dispatch(0, value);
  }

  return composedMiddleware;
}

export function composeAsyncMiddleware<TIn, TOut>(middlewares: AsyncMiddleware<TIn, TOut>[], handler: AsyncMiddlerwareHandler<TIn, TOut>, options: MiddlewareOptions = {}): ComposedAsyncMiddlerware<TIn, TOut> {
  async function composedMiddleware(value: TIn): Promise<TOut> {
    let currentIndex = -1;

    async function dispatch(index: number, dispatchedValue: TIn): Promise<TOut> {
      if (index == middlewares.length) {
        return handler(dispatchedValue);
      }

      const middleware = middlewares[index]!;
      currentIndex = index;

      async function next(nextValue: TIn): Promise<TOut> {
        if ((index < currentIndex) && (options.allowMultipleNextCalls != true)) {
          throw new Error('next() called multiple times');
        }

        return dispatch(index + 1, nextValue);
      }

      return middleware(dispatchedValue, next);
    }

    return dispatch(0, value);
  }

  return composedMiddleware;
}
