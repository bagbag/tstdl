import { InjectionToken } from '@angular/core';
import type { StringMap } from '@tstdl/base/esm/types';

export type MessageBoxAction<T = any> = {
  text: string,
  localize?: boolean,
  value: T
};

export type MessageBoxResult<T = any> = {
  actionValue: T,
  textInput: string
};

export type MessageBoxData<T = any> = {
  actions: MessageBoxAction<T>[],
  showInput?: boolean,
  title?: string,
  message: string,
  localizeTitle?: boolean,
  localizeMessage?: boolean,
  localizeTitleParameters?: StringMap<string | number>,
  localizeMessageParameters?: StringMap<string | number>
};

export type NotifyData = {
  message: string,
  localize?: boolean
};

export interface NotificationService {
  openMessageBox<T>(data: MessageBoxData<T>): Promise<T | undefined>;
  notify(data: NotifyData): void;
}

export const notificationServiceInjectionToken = new InjectionToken<NotificationService>('NotificationService');
