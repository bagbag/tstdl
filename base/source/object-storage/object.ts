export type ObjectInformation = {
  module: string,
  key: string,
  resource: string,
  contentLength: number
};

export type ObjectStorageObject<T extends ObjectInformation = ObjectInformation> = T & {
  content: ArrayBuffer
};
