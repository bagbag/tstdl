import { registerSerializationType } from '../serializer';

export function registerDateType(register: typeof registerSerializationType): void {
  register(Date, (date) => date.getTime(), (timestamp) => new Date(timestamp));
}
