export type ObjectInformation = {
  module: string,
  key: string,
  contentLength: number
};

export type Object<T extends ObjectInformation = ObjectInformation> = T & {
  content: ArrayBuffer
};
