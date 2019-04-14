export async function readAsText(blob: Blob, encoding?: string): Promise<string> {
  return setup((reader) => reader.readAsText(blob, encoding));
}

export async function readAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return setup((reader) => reader.readAsArrayBuffer(blob));
}

export async function readAsBinaryString(blob: Blob): Promise<string> {
  return setup((reader) => reader.readAsBinaryString(blob));
}

export async function readAsDataUrl(blob: Blob): Promise<string> {
  return setup((reader) => reader.readAsDataURL(blob));
}

async function setup<T extends FileReader['result']>(dispatcher: (reader: FileReader) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as T);
    reader.onerror = () => reject(new Error((reader.error as DOMException).message));

    dispatcher(reader);
  });
}
