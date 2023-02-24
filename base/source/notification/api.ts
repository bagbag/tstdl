import { apiController } from '#/api/server/api-controller.js';
import type { ApiServerResult } from '#/api/types.js';
import { defineApi } from '#/api/types.js';
import { array } from '#/schema/index.js';
import { Notification } from './models/index.js';
import { notificationModuleConfig } from './module.js';

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
