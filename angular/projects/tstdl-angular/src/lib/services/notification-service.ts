import { InjectionToken } from '@angular/core';
import type { StringMap } from '@tstdl/base/esm/types';

export type MessageBoxAction<T = any> = {
  text: string,
  localize?: boolean,
  value?: T,
  disableOnInvalidInputs?: boolean,
  handler?: (value: T) => any | Promise<any>
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

export type MessageBoxInput = {
  type: InputType,
  label?: string,
  placeholder?: string,
  value?: any,
  min?: string | number,
  max?: string | number,
  validator?: (value: any) => boolean
};

export type MessageBoxData<T = any> = {
  header?: string,
  subHeader?: string,
  message?: string,
  actions: MessageBoxAction<T>[],
  inputs?: StringMap<MessageBoxInput>,
  backdropDismiss?: boolean,
  localizeHeader?: boolean,
  localizeSubHeader?: boolean,
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
