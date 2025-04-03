import { numericDateToTimestamp } from './utils/date-time.js';
import { memoize, memoizeSingle } from './utils/function/memoize.js';
import { isNull, isNullOrUndefined, isUndefined } from './utils/type-guards.js';

export let locale = 'de-DE';

export function configureFormats(options: { locale?: string }): void {
  locale = options.locale ?? locale;
}

export const integerFormat: Intl.NumberFormatOptions = {
  useGrouping: true,
  maximumFractionDigits: 0
};

export const decimalFormat: Intl.NumberFormatOptions = {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

export const decimal1Format: Intl.NumberFormatOptions = {
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
};

export const yearFormat: Intl.NumberFormatOptions = {
  useGrouping: false,
  maximumFractionDigits: 0
};

export const dateTimeNumeric: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
};

export const dateTimeShort: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
};

export const dateTimeLong: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  weekday: 'long',
  month: 'long',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
};

export const dateShort: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
};

export const dateMedium: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: '2-digit'
};

export const dateLong: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  weekday: 'long',
  month: 'long',
  day: '2-digit'
};

export const timeShort: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit'
};

export const euroFormat: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'EUR'
};

export const euroFormatWithoutCents: Intl.NumberFormatOptions = {
  ...euroFormat,
  minimumFractionDigits: 0
};

export const percentFormat: Intl.NumberFormatOptions = {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

const getDecimalFormatter = memoize(_getDecimalFormatter);

const dateFormatter = memoizeSingle((loc: string) => Intl.DateTimeFormat(loc, dateShort));
const integerFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, integerFormat));
const decimalFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, decimalFormat));
const yearFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, yearFormat));
const euroFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, euroFormat));
const percentFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, percentFormat));
const timeShortFormatter = memoizeSingle((loc: string) => Intl.DateTimeFormat(loc, timeShort));
const dateShortFormatter = memoizeSingle((loc: string) => Intl.DateTimeFormat(loc, dateShort));

export function formatNumber(value: number, format?: Intl.NumberFormatOptions): string {
  return Intl.NumberFormat(locale, format).format(value);
}

export function formatInteger(value: number): string {
  return integerFormatter(locale).format(value);
}

export function formatDecimal(value: number, minimumFractionDigits?: number, maximumFractionDigits?: number): string {
  if (isUndefined(minimumFractionDigits) && isUndefined(maximumFractionDigits)) {
    return decimalFormatter(locale).format(value);
  }

  return getDecimalFormatter(minimumFractionDigits ?? 2, maximumFractionDigits ?? 2).format(value);
}

export function formatYear(value: number): string {
  return yearFormatter(locale).format(value);
}

export function formatTimeShort(value: number): string {
  return timeShortFormatter(locale).format(new Date(1970, 1, 1, 0, 0, 0, value));
}

export function formatDateShort(value: Date | number): string {
  return dateShortFormatter(locale).format(value);
}

export function formatDate(dateOrTimestamp: number | Date): string {
  return dateFormatter(locale).format(dateOrTimestamp);
}

export function formatNumericDate(numericDate: number): string {
  return formatDate(numericDateToTimestamp(numericDate));
}

export function formatEuro(value: number): string {
  return euroFormatter(locale).format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter(locale).format(value);
}

export type FormatPersonNameOptions = { lastNameFirst?: boolean, nullOnMissing?: boolean };

export function formatPersonName(person: { firstName: string, lastName: string | null } | null | undefined, options: FormatPersonNameOptions & { nullOnMissing: true }): string | null;
export function formatPersonName(person: { firstName: string, lastName: string | null } | null | undefined, options?: FormatPersonNameOptions): string;
export function formatPersonName(person: { firstName: string, lastName: string | null } | null | undefined, { lastNameFirst = false, nullOnMissing = false }: FormatPersonNameOptions = {}): string | null {
  if (isNullOrUndefined(person)) {
    return nullOnMissing ? null : '-';
  }

  if (isNull(person.lastName)) {
    return person.firstName;
  }

  if (lastNameFirst) {
    return `${person.lastName}, ${person.firstName}`;
  }

  return `${person.firstName} ${person.lastName}`;
}

/**
 * @deprecated use {@link formatPersonName} instead
 */
export const formatUserName = formatPersonName;

function _getDecimalFormatter(minimumFractionDigits = 2, maximumFractionDigits = 2): Intl.NumberFormat {
  return Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits
  });
}
