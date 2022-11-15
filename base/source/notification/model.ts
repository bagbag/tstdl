import { Any, Property, Class } from '#/schema';

@Class()
export class Notification {
  /**
   *
   */
  @Property()
  for: string;

  /**
   * Timestamp at which the notification was created.
   */
  @Property()
  timestamp: number;

  /**
   * Timestamp at which the notification was marked as read.
   */
  @Property()
  read: number | null;

  /**
   * Custom data.
   */
  @Any()
  data: any;
}
