import type { NotificationChannelJob } from './models';

export abstract class NotificationChannel {
  abstract type: string;

  abstract handle(job: NotificationChannelJob): Promise<void>;
}
