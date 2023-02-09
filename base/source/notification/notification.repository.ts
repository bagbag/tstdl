import type { NewNotification, Notification } from './models';

export abstract class NotificationRepository<T> {
  abstract insertAndLoad(notification: NewNotification<T>): Promise<Notification<T>>;

  abstract markAsRead(id: string): Promise<void>;
}
