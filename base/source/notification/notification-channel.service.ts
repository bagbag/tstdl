import type { NotificationChannelJob } from './models/notification-channel-job.model.js';

export abstract class NotificationChannel {
  abstract type: string;

  abstract handle(job: NotificationChannelJob): Promise<void>;
}
