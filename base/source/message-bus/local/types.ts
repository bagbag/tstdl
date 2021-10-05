export type LocalMessageBusItem<T = unknown> = {
  source: symbol,
  message: T
};
