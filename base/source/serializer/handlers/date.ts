import { registerSerializationType } from '../serializer';

export function registerDateType(): void {
  registerSerializationType(Date, (date) => date.getTime(), (timestamp) => new Date(timestamp));
}
