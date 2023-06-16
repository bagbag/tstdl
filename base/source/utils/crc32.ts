/* eslint-disable no-bitwise */

let crcTable: Uint32Array | undefined;

export function crc32b(bytes: Uint8Array): Uint8Array {
  crcTable ??= generateCrc32Table();

  let crc = 0 ^ (-1);

  for (let i = 0; i < bytes.length; i++) { // eslint-disable-line @typescript-eslint/prefer-for-of
    crc = (crc >>> 8) ^ crcTable[(crc & 0xff) ^ bytes[i]!]!;
  }

  crc = (crc ^ (-1)) >>> 0;

  const buffer = new ArrayBuffer(4);
  const dataView = new DataView(buffer);

  dataView.setUint32(0, crc, false);

  return new Uint8Array(buffer);
}

function generateCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let c = i;

    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }

    table[i] = c;
  }

  return table;
}
