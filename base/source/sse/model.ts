
export type ServerSentEventBase<Data> = {
  /**
   * Name of the event.
   */
  name?: string,

  /**
   * Data of the event.
   */
  data?: Data,

  /**
   * Id of the event.
   */
  id?: string,

  /**
   * Retry recommendation for consumers in milliseconds.
   */
  retry?: number
};

export type ServerSentTextEvent = ServerSentEventBase<string>;

export type ServerSentJsonEvent = ServerSentEventBase<any>;

export type ServerSentEvent = ServerSentTextEvent | ServerSentJsonEvent;
