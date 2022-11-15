import type { ApiServerResult } from '#/api';
import { defineApi } from '#/api';
import { apiController } from '#/api/server';
import { array, object, string } from '#/schema';
import { Notification } from './model';
import { notificationModuleConfig } from './module';

const notificationApiDefinition = defineApi({
  get resource() { return notificationModuleConfig.apiResource; },
  endpoints: {
    get: {
      parameters: object({
        for: string()
      }),
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
