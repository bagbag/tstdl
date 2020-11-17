export const millisecondsPerSecond = 1000;
export const millisecondsPerMinute = millisecondsPerSecond * 60;
export const millisecondsPerHour = millisecondsPerMinute * 60;
export const millisecondsPerDay = millisecondsPerHour * 24;
export const millisecondsPerWeek = millisecondsPerDay * 7;

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
