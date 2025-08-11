export type ComposedMiddleware<Context = unknown> = (context: Context) => void;
export type MiddlewareNext = () => void;
export type Middleware<Context = unknown> = (context: Context, next: MiddlewareNext) => void;

export type ComposedAsyncMiddleware<Context = unknown> = (context: Context) => Promise<void>;
export type AsyncMiddlewareNext = () => void | Promise<void>;
export type AsyncMiddleware<Context = unknown> = (context: Context, next: AsyncMiddlewareNext) => void | Promise<void>;

export type MiddlewareOptions = {
  allowMultipleNextCalls?: boolean,
};

export function composeMiddleware<Context = unknown>(middlewares: Middleware<Context>[], options: MiddlewareOptions = {}): ComposedMiddleware<Context> {
  function composedMiddleware(context: Context): void {
    let currentIndex = -1;

    function dispatch(index: number): void {
      if (index == middlewares.length) {
        return;
      }

      const middleware = middlewares[index]!;
      currentIndex = index;

      function next(): void {
        if ((index < currentIndex) && (options.allowMultipleNextCalls != true)) {
          throw new Error('next() called multiple times');
        }

        dispatch(index + 1);
      }

      middleware(context, next);
    }

    dispatch(0);
  }

  return composedMiddleware;
}

export function composeAsyncMiddleware<Context>(middlewares: AsyncMiddleware<Context>[], options: MiddlewareOptions = {}): ComposedAsyncMiddleware<Context> {
  async function composedMiddleware(context: Context): Promise<void> {
    let currentIndex = -1;

    async function dispatch(index: number): Promise<void> {
      if (index == middlewares.length) {
        return;
      }

      const middleware = middlewares[index]!;
      currentIndex = index;

      async function next(): Promise<void> {
        if ((index < currentIndex) && (options.allowMultipleNextCalls != true)) {
          throw new Error('next() called multiple times');
        }

        await dispatch(index + 1);
      }

      await middleware(context, next);
    }

    await dispatch(0);
  }

  return composedMiddleware;
}
