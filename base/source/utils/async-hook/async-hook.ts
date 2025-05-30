export type AsyncHook<T, C = never, R = unknown> = {
  register: (handler: AsyncHookHandler<T, C, R>) => AsyncHookHandlerRegistration,
  trigger: [C] extends [never] ? ((value: T) => Promise<R[]>) : ((value: T, context: C) => Promise<R[]>),
};

export type AsyncHookHandler<T, C, R> = [C] extends [never] ? ((value: T) => R | Promise<R>) : ((value: T, context: C) => R | Promise<R>);
export type AsyncHookHandlerRegistration = { unregister: () => void };

export function asyncHook<T, C = never, R = unknown>(): AsyncHook<T, C, R> {
  const handlers: AsyncHookHandler<T, C, R>[] = [];

  return {
    register: (handler: AsyncHookHandler<T, C, R>): AsyncHookHandlerRegistration => {
      handlers.push(handler);

      return {
        unregister() {
          handlers.splice(handlers.indexOf(handler));
        },
      };
    },
    trigger: async (value: T, context?: C) => {
      let returnValues: R[] = [];

      for (const handler of handlers) {
        const returnValue = await handler(value, context!);
        returnValues.push(returnValue);
      }

      return returnValues;
    },
  };
}
