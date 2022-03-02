export type ComposedMiddleware<TIn, TOut, Context = unknown> = (value: TIn, context: Context) => TOut;
export type MiddlewareHandler<TIn, TOut, Context = unknown> = (value: TIn, context: Context) => TOut;
export type MiddlewareNext<TIn, TOut> = (value: TIn) => TOut;
export type Middleware<TIn, TOut, Context = unknown> = (value: TIn, next: MiddlewareNext<TIn, TOut>, context: Context) => TOut | TOut;

export type ComposedAsyncMiddleware<TIn, TOut, Context = unknown> = (value: TIn, context: Context) => Promise<TOut>;
export type AsyncMiddlewareHandler<TIn, TOut, Context = unknown> = (value: TIn, context: Context) => TOut | Promise<TOut>;
export type AsyncMiddlewareNext<TIn, TOut> = (value: TIn) => TOut | Promise<TOut>;
export type AsyncMiddleware<TIn, TOut, Context = unknown> = (value: TIn, next: AsyncMiddlewareNext<TIn, TOut>, context: Context) => TOut | Promise<TOut>;

export type MiddlewareOptions = {
  allowMultipleNextCalls?: boolean
};

export function composeMiddleware<TIn, TOut, Context = unknown>(middlewares: Middleware<TIn, TOut, Context>[], handler: MiddlewareHandler<TIn, TOut, Context>, options: MiddlewareOptions = {}): ComposedMiddleware<TIn, TOut, Context> {
  function composedMiddleware(value: TIn, context: Context): TOut {
    let currentIndex = -1;

    function dispatch(index: number, dispatchedValue: TIn): TOut {
      if (index == middlewares.length) {
        return handler(dispatchedValue, context);
      }

      const middleware = middlewares[index]!;
      currentIndex = index;

      function next(nextValue: TIn): TOut {
        if ((index < currentIndex) && (options.allowMultipleNextCalls != true)) {
          throw new Error('next() called multiple times');
        }

        return dispatch(index + 1, nextValue);
      }

      return middleware(dispatchedValue, next, context);
    }

    return dispatch(0, value);
  }

  return composedMiddleware;
}

export function composeAsyncMiddleware<TIn, TOut, Context>(middlewares: AsyncMiddleware<TIn, TOut, Context>[], handler: AsyncMiddlewareHandler<TIn, TOut, Context>, options: MiddlewareOptions = {}): ComposedAsyncMiddleware<TIn, TOut, Context> {
  async function composedMiddleware(value: TIn, context: Context): Promise<TOut> {
    let currentIndex = -1;

    async function dispatch(index: number, dispatchedValue: TIn): Promise<TOut> {
      if (index == middlewares.length) {
        return handler(dispatchedValue, context);
      }

      const middleware = middlewares[index]!;
      currentIndex = index;

      async function next(nextValue: TIn): Promise<TOut> {
        if ((index < currentIndex) && (options.allowMultipleNextCalls != true)) {
          throw new Error('next() called multiple times');
        }

        return dispatch(index + 1, nextValue);
      }

      return middleware(dispatchedValue, next, context);
    }

    return dispatch(0, value);
  }

  return composedMiddleware;
}
