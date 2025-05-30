import { numericDateToTimestamp } from './utils/date-time.js';
import { memoize, memoizeSingle } from './utils/function/memoize.js';
import { isNullOrUndefined, isUndefined } from './utils/type-guards.js';

export let locale = 'de-DE';

export function configureFormats(options: { locale?: string }): void {
  locale = options.locale ?? locale;
}

export const integerFormat: Intl.NumberFormatOptions = {
  useGrouping: true,
  maximumFractionDigits: 0,
};

export const decimalFormat: Intl.NumberFormatOptions = {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export const decimal1Format: Intl.NumberFormatOptions = {
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
};

export const yearFormat: Intl.NumberFormatOptions = {
  useGrouping: false,
  maximumFractionDigits: 0,
};

export const dateTimeNumeric: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

export const dateTimeShort: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

export const dateTimeLong: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  weekday: 'long',
  month: 'long',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

export const dateShort: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

export const dateMedium: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: '2-digit',
};

export const dateLong: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  weekday: 'long',
  month: 'long',
  day: '2-digit',
};

export const timeShort: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

export const currencyFormat: Intl.NumberFormatOptions = {
  style: 'currency',
};

export const currencyFormatWithoutCents: Intl.NumberFormatOptions = {
  ...currencyFormat,
  minimumFractionDigits: 0,
};

export const percentFormat: Intl.NumberFormatOptions = {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const getDecimalFormatter = memoize(_getDecimalFormatter);

const integerFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, integerFormat));
const decimalFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, decimalFormat));
const yearFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, yearFormat));
const percentFormatter = memoizeSingle((loc: string) => Intl.NumberFormat(loc, percentFormat));
const dateFormatter = memoizeSingle((loc: string) => Intl.DateTimeFormat(loc, dateShort));
const currencyFormatter = memoize((currency: string, loc: string) => Intl.NumberFormat(loc, { ...currencyFormat, currency }));
const currencyFormatterWithoutCents = memoize((currency: string, loc: string) => Intl.NumberFormat(loc, { ...currencyFormatWithoutCents, currency }));
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

  return getDecimalFormatter(locale, minimumFractionDigits ?? 2, maximumFractionDigits ?? 2).format(value);
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

export function formatCurrency(value: number, currency: string): string {
  return currencyFormatter(currency, locale).format(value);
}

export function formatCurrencyWithoutCents(value: number, currency: string): string {
  return currencyFormatterWithoutCents(currency, locale).format(value);
}

export function formatEuro(value: number): string {
  return currencyFormatter('EUR', locale).format(value);
}

export function formatEuroWithoutCents(value: number): string {
  return currencyFormatterWithoutCents('EUR', locale).format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter(locale).format(value);
}

export type FormatPersonNameOptions<F = unknown> = { lastNameFirst?: boolean, fallback?: F };

export function formatPersonName<F>(person: { firstName?: string | null, lastName?: string | null } | null | undefined, options: FormatPersonNameOptions<F> & { fallback: F }): string | F;
export function formatPersonName(person: { firstName?: string | null, lastName?: string | null } | null | undefined, options?: FormatPersonNameOptions & { fallback?: undefined }): string;
export function formatPersonName<F>(person: { firstName?: string | null, lastName?: string | null } | null | undefined, { lastNameFirst = false, fallback }: FormatPersonNameOptions<F> = {}): string | F {
  if (isNullOrUndefined(person?.firstName) || isNullOrUndefined(person.lastName)) {
    return person?.firstName ?? person?.lastName ?? fallback ?? '-';
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

function _getDecimalFormatter(locale: string, minimumFractionDigits = 2, maximumFractionDigits = 2): Intl.NumberFormat {
  return Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits,
  });
}
