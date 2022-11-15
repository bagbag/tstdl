export type NotificationModuleConfig = {
  apiResource: string
};

export const notificationModuleConfig: NotificationModuleConfig = {
  apiResource: 'notifications'
};

/**
 * Configure notifiation module.
 * @param config configuration
 */
export function configureNotification(config: Partial<NotificationModuleConfig>): void {
  notificationModuleConfig.apiResource = config.apiResource ?? notificationModuleConfig.apiResource;
}
