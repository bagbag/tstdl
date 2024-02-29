import { NotSupportedError } from '#/errors/not-supported.error.js';
import type { DateObjectUnits, DateTimeJSOptions } from 'luxon';
import { DateTime } from 'luxon';
import { isDate, isNumber } from './type-guards.js';
import { typeOf } from './type-of.js';
import { millisecondsPerDay, millisecondsPerHour, millisecondsPerMinute, millisecondsPerSecond } from './units.js';

export type DateObject = {
  year: number,
  month: number,
  day: number
};

export type ZonedDateObject = DateObject & {
  zone: string
};

export type TimeObject = {
  hour: number,
  minute: number,
  second: number,
  millisecond: number
};

export type ZonedTimeObject = TimeObject & {
  zone: string
};

export type SimpleDateTimeObject = DateObject & TimeObject;

export type ZonedDateTimeObject = SimpleDateTimeObject & {
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
  return timestampToTimestampSeconds(currentTimestamp());
}

export function timestampToTimestampSeconds(timestamp: number): number {
  return Math.floor(timestamp / 1000);
}

export function currentDate(): number {
  const timestamp = currentTimestamp();
  return timestampToNumericDate(timestamp);
}

export function currentTime(): number {
  const timestamp = currentTimestamp();
  return timestampToTime(timestamp);
}

/**
 * @param input {@link DateTime}, Date or timestamp in milliseconds
 * @returns DateTime
 */
export function toDateTime(input: DateTime | Date | number): DateTime {
  if (isNumber(input)) {
    return DateTime.fromMillis(input);
  }

  if (isDate(input)) {
    return DateTime.fromJSDate(input);
  }

  if (DateTime.isDateTime(input)) {
    return input;
  }

  throw new NotSupportedError(`Unsupported input type "${typeOf(input)}".`);
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

export function timeObjectToNumericTime(time: Partial<TimeObject>): number {
  return ((time.hour ?? 0) * millisecondsPerHour)
    + ((time.minute ?? 0) * millisecondsPerMinute)
    + ((time.second ?? 0) * millisecondsPerSecond)
    + (time.millisecond ?? 0);
}

export function numericTimeToTimeObject(time: number): TimeObject {
  return {
    hour: Math.floor(time / millisecondsPerHour),
    minute: Math.floor((time % millisecondsPerHour) / millisecondsPerMinute),
    second: Math.floor((time % millisecondsPerMinute) / millisecondsPerSecond),
    millisecond: Math.floor(time % millisecondsPerSecond)
  };
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

export function zonedDateObjectToDateTime(zonedDate: ZonedDateObject, units?: DateObjectUnits, options?: DateTimeJSOptions): DateTime {
  return DateTime.fromObject({ ...zonedDate, ...units }, options);
}

export function dateTimeToNumericDate(dateTime: DateTime): number {
  const timestamp = dateTime.toUTC(undefined, { keepLocalTime: true }).toMillis();
  return timestampToNumericDate(timestamp);
}

export function numericDateToDateTime(numericDate: number, units?: DateObjectUnits, options?: DateTimeJSOptions): DateTime {
  const date = numericDateToDate(numericDate);
  return DateTime.fromObject({ ...date, ...units }, options);
}

export function dateTimeToTime(dateTime: DateTime): number {
  const interval = dateTime.startOf('day').until(dateTime);

  if (interval.isValid) {
    return interval.count('milliseconds');
  }

  throw new Error(`Invalid DateTime: ${interval.invalidExplanation}`);
}

export function numericDateTimeToDateTime({ date, time }: NumericDateTime, zone?: string): DateTime {
  return numericDateToDateTime(date, undefined, { zone }).set({ millisecond: time });
}
