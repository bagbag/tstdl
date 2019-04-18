import { Serializer } from '../serializer';

export function registerDateType(serializer: typeof Serializer): void {
  serializer.registerType(Date, (date) => date.getTime(), (timestamp) => new Date(timestamp));
}
