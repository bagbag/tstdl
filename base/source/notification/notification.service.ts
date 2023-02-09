import { singleton } from '#/container';
import { currentTimestamp } from '#/utils/date-time';
import type { NewNotification, Notification } from './models';
import { NotificationRepository } from './notification.repository';

@singleton()
export class NotificationService<T> {
  private readonly notificationRepository: NotificationRepository<T>;

  constructor(notificationRepository: NotificationRepository<T>) {
    this.notificationRepository = notificationRepository;
  }

  async send(receiver: string, channels: string[], data: T): Promise<Notification<T>> {
    const newNotification: NewNotification<T> = {
      receiver,
      channels,
      timestamp: currentTimestamp(),
      readTimestamp: null,
      data
    };

    return this.notificationRepository.insertAndLoad(newNotification);
  }

  async markAsRead(id: string): Promise<void> {
    return this.notificationRepository.markAsRead(id);
  }
}
