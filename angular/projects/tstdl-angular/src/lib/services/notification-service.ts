import { InjectionToken } from '@angular/core';
import type { StringMap } from '@tstdl/base/esm/types';

export type MessageBoxAction<T = any> = {
  text: string,
  localize?: boolean,
  value: T
};

export type MessageBoxResult<T = any> = {
  actionValue: T,
  input: string
};

export type InputType =
  | 'checkbox'
  | 'color'
  | 'date'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'image'
  | 'month'
  | 'number'
  | 'password'
  | 'radio'
  | 'range'
  | 'search'
  | 'tel'
  | 'text'
  | 'time'
  | 'url'
  | 'week';

export type MessageBoxData<T = any> = {
  actions: MessageBoxAction<T>[],
  input?: InputType,
  header?: string,
  message?: string,
  backdropDismiss?: boolean,
  localizeHeader?: boolean,
  localizeMessage?: boolean,
  localizeHeaderParameters?: StringMap<string | number>,
  localizeMessageParameters?: StringMap<string | number>
};

export type NotifyData = {
  header?: string,
  message: string,
  localize?: boolean,
  localizeParameters?: StringMap,
  duration?: number
};

export interface NotificationService {
  openMessageBox<T>(data: MessageBoxData<T>): Promise<T | undefined>;
  notify(data: NotifyData): void;
}

export const notificationServiceInjectionToken = new InjectionToken<NotificationService>('NotificationService');
