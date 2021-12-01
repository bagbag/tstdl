import type { StringMap } from '@tstdl/base/types';
import type { LocalizationData } from './localization.service';

export type MessageBoxResult<T = any> = {
  actionValue?: T,
  inputs: StringMap
};

export type MessageBoxAction<T = any> = {
  text: string | LocalizationData,
  value?: T,
  disableOnInvalidInputs?: boolean,
  handler?: (value: T | undefined, inputs: StringMap) => any | Promise<any>
};

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

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
  label?: string | LocalizationData,
  placeholder?: string | LocalizationData,
  value?: any,
  min?: string | number,
  max?: string | number,
  validator?: (value: any) => boolean
};

export type MessageBoxData<T = any> = {
  type?: NotificationType,
  header?: string | LocalizationData,
  subHeader?: string | LocalizationData,
  message?: string | LocalizationData,
  actions?: MessageBoxAction<T>[],
  inputs?: StringMap<MessageBoxInput>,
  backdropDismiss?: boolean
};

export type NotifyData = {
  type?: NotificationType,
  header?: string | LocalizationData,
  message: string | LocalizationData,
  duration?: number
};

export abstract class NotificationService {
  abstract openMessageBox<T>(data: MessageBoxData<T>): Promise<MessageBoxResult<T>>;
  abstract notify(data: NotifyData): void;
}
