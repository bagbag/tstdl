import { Any, Array, Class, Property } from '#/schema';

export class Notification<T = unknown> {
  @Property()
  id: string;

  /**
   * Receiver for the notification
   */
  @Property()
  receiver: string;

  /**
   * Channels over which the notification is sent
   */
  @Array(String)
  channels: string[];

  /**
   * Timestamp at which the notification was created
   */
  @Property()
  timestamp: number;

  /**
   * Timestamp at which the notification was marked as read
   */
  @Property()
  readTimestamp: number | null;

  /**
   * Custom data
   */
  @Any()
  data: T;
}

@Class()
export class NewNotification<T> {
  /**
   * Receiver for the notification
   */
  @Property()
  receiver: string;

  /**
   * Channels over which the notification is sent
   */
  @Array(String)
  channels: string[];

  /**
   * Timestamp at which the notification was created
   */
  @Property()
  timestamp: number;

  /**
   * Timestamp at which the notification was marked as read
   */
  @Property()
  readTimestamp: number | null;

  /**
   * Custom data
   */
  @Any()
  data: T;
}
