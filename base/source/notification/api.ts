import type { ApiServerResult } from '#/api';
import { defineApi } from '#/api';
import { apiController } from '#/api/server';
import { array } from '#/schema';
import { Notification } from './models';
import { notificationModuleConfig } from './module';

const notificationApiDefinition = defineApi({
  get resource() { return notificationModuleConfig.apiResource; },
  endpoints: {
    get: {
      result: array(Notification)
    }
  }
});

type NotificationApiDefinition = typeof notificationApiDefinition;

@apiController(notificationApiDefinition)
export class NotificationApi {
  async get(): Promise<ApiServerResult<NotificationApiDefinition, 'get'>> {
    return [];
  }
}
