export type LocalMessageBusItem<T> = {
  source: symbol,
  message: T
};
