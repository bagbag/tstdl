function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);

  let base64: string;

  if (typeof Buffer != 'undefined') {
    base64 = Buffer.from(uint8Array).toString('base64');
  }
  else {
    const chunkSize = 2 ** 15; // arbitrary number
    const length = uint8Array.length;

    let index = 0;
    let result = '';
    let slice;

    while (index < length) {
      slice = uint8Array.subarray(index, Math.min(index + chunkSize, length));
      result += String.fromCharCode.apply(undefined, [...slice]);
      index += chunkSize;
    }

    base64 = btoa(result);
  }

  return base64;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer != 'undefined') {
    return Buffer.from(base64, 'base64');
  }

  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}
