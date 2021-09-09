import type { DateObjectUnits, DateTimeJSOptions } from 'luxon';
import { DateTime } from 'luxon';
import { millisecondsPerDay } from './units';

export type SimpleDate = {
  year: number,
  month: number,
  day: number
};

export type ZonedDate = SimpleDate & {
  zone: string
};

export type SimpleTime = {
  hour: number,
  minute: number,
  second: number
};

export type ZonedTime = SimpleTime & {
  zone: string
};

export type SimpleDateTime = SimpleDate & SimpleTime;

export type ZonedDateTime = SimpleDateTime & {
  zone: string
};

export type NumericDateTime = {
  date: number,
  time: number
};

export function now(): Date {
  return new Date();
}

export function currentTimestamp(): number {
  return Date.now();
}

export function currentTimestampSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function currentDate(): number {
  const timestamp = currentTimestamp();
  return timestampToNumericDate(timestamp);
}

export function currentTime(): number {
  const timestamp = currentTimestamp();
  return timestampToTime(timestamp);
}

export function timestampToNumericDate(timestamp: number): number {
  return Math.floor(timestamp / millisecondsPerDay);
}

export function dateToNumericDate(date: Date): number {
  const timestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return timestampToNumericDate(timestamp);
}

export function timestampToTime(timestamp: number): number {
  return timestamp % millisecondsPerDay;
}

export function timestampToNumericDateAndTime(timestamp: number): NumericDateTime {
  return {
    date: timestampToNumericDate(timestamp),
    time: timestampToTime(timestamp)
  };
}

export function numericDateToTimestamp(numericDate: number): number {
  return numericDate * millisecondsPerDay;
}

export function numericDateToDate(numericDate: number): { year: number, month: number, day: number } {
  const timestamp = numericDateToTimestamp(numericDate);
  const date = new Date(timestamp);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

export function numericDateTimeToTimestamp({ date, time }: NumericDateTime): number {
  return numericDateToTimestamp(date) + time;
}

export function zonedDateToDateTime(zonedDate: ZonedDate, unitsAndOptions: DateObjectUnits & DateTimeJSOptions): DateTime {
  return DateTime.fromObject({ ...zonedDate, ...unitsAndOptions }, unitsAndOptions);
}

export function dateTimeToNumericDate(dateTime: DateTime): number {
  const timestamp = dateTime.toUTC(undefined, { keepLocalTime: true }).toMillis();
  return timestampToNumericDate(timestamp);
}

export function numericDateToDateTime(numericDate: number, unitsAndOptions?: DateObjectUnits & DateTimeJSOptions): DateTime {
  const date = numericDateToDate(numericDate);
  return DateTime.fromObject({ ...date, ...unitsAndOptions }, unitsAndOptions);
}

export function dateTimeToTime(dateTime: DateTime): number {
  return dateTime.startOf('day').until(dateTime).count('milliseconds');
}

export function numericDateTimeToDateTime(date: number, time: number, zone: string): DateTime {
  return numericDateToDateTime(date, { zone }).set({ millisecond: time });
}
