export function serializeDate(date: Date): number {
  return date.getTime();
}

export function deserializeDate(timestamp: number): Date {
  return new Date(timestamp);
}
