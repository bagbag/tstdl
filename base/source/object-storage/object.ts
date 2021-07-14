export type ObjectInformation = {
  module: string,
  key: string,
  contentLength: number
};

export type ObjectStorageObject<T extends ObjectInformation = ObjectInformation> = T & {
  content: ArrayBuffer
};
