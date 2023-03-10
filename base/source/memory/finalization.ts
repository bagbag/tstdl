import { isDefined, isUndefined } from '#/utils/type-guards';

export type FinalizationHandler<D = any> = (data: D) => any;

const objectTokens = new WeakMap<object, symbol>();
const registrations = new Map<symbol, Map<FinalizationHandler, any>>();

const finalizationRegistry = new FinalizationRegistry<symbol>(internalHandler);

export function registerFinalization(object: object, handler: FinalizationHandler<void>): void;
export function registerFinalization<D>(object: object, handler: FinalizationHandler<D>, data: D): void;
export function registerFinalization<D>(object: object, handler: FinalizationHandler<D>, data?: D): void {
  let token = objectTokens.get(object);

  if (isUndefined(token)) {
    token = Symbol(undefined);
    objectTokens.set(object, token);
    finalizationRegistry.register(object, token, object);
  }

  let handlers = registrations.get(token);

  if (isUndefined(handlers)) {
    handlers = new Map();
    registrations.set(token, handlers);
  }

  handlers.set(handler, data);
}

export function unregisterFinalization(object: object, handler: FinalizationHandler): void {
  const token = objectTokens.get(object);

  if (isUndefined(token)) {
    return;
  }

  const handlers = registrations.get(token);

  if (isDefined(handlers)) {
    handlers.delete(handler);

    if (handlers.size == 0) {
      registrations.delete(token);
      finalizationRegistry.unregister(object);
    }
  }
}

function internalHandler(token: symbol): void {
  const handlers = registrations.get(token);

  if (isUndefined(handlers)) {
    return;
  }

  for (const [handler, data] of handlers) {
    handler(data);
  }

  registrations.delete(token);
}
