export const millisecondsPerDay = 1000 * 60 * 60 * 24;
export const secondsPerDay = 60 * 60 * 24;

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
  return Math.floor(timestamp / 86400000);
}

export function dateToNumericDate(date: Date): number {
  const timestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return timestampToNumericDate(timestamp);
}

export function timestampToTime(timestamp: number): number {
  return timestamp % 86400;
}

export function timestampToNumericDateAndTime(timestamp: number): NumericDateTime {
  return {
    date: timestampToNumericDate(timestamp),
    time: timestampToTime(timestamp)
  };
}

export function numericDateToTimestamp(numericDate: number): number {
  return numericDate * 86400000;
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
