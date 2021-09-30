export type ObjectInformation = {
  module: string,
  key: string,
  resourceUri: string,
  contentLength: number
};

export type ObjectStorageObject<T extends ObjectInformation = ObjectInformation> = T & {
  content: ArrayBuffer
};
