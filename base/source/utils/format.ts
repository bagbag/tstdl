
const siByteSizes = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const iecByteSizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

export function formatDuration(milliseconds: number, precision: number): string {
  let value: number;
  let suffix: string;

  if (milliseconds >= (10 ** 3)) {
    value = milliseconds / (10 ** 3);
    suffix = 's';
  }
  else if (milliseconds >= 1) {
    value = milliseconds;
    suffix = 'ms';
  }
  else if (milliseconds >= 1 / (10 ** 3)) {
    value = milliseconds * (10 ** 3);
    suffix = 'us';
  }
  else {
    value = milliseconds * (10 ** 6);
    suffix = 'ns';
  }

  const trimmed = parseFloat(value.toFixed(precision));
  const result = `${trimmed} ${suffix}`;

  return result;
}

export function formatBytes(bytes: number, { decimals = 2, unit = 'IEC' }: { decimals?: number, unit?: 'SI' | 'IEC' } = {}): string {
  const iec = unit == 'IEC';
  const base = iec ? 1024 : 1000;
  const exponent = Math.floor(Math.log(bytes) / Math.log(base));
  const prefix = (iec ? iecByteSizes : siByteSizes)[exponent];
  const result = (bytes / (base ** exponent));
  const formattedResult = Intl.NumberFormat(undefined, { useGrouping: false, maximumFractionDigits: decimals }).format(result);

  return `${formattedResult} ${prefix}`;
}
