import type { StringMap } from '@tstdl/base/cjs/types';
import type { LocalizationKey } from './localization.service';

export type MessageBoxResult<T = any> = {
  actionValue?: T,
  inputs: StringMap
};

export type MessageBoxAction<T = any> = {
  text: string | LocalizationKey,
  localizeText?: boolean,
  localizeTextParameters?: StringMap,
  value?: T,
  disableOnInvalidInputs?: boolean,
  handler?: (value: T | undefined, inputs: StringMap) => any | Promise<any>
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
  label?: string | LocalizationKey,
  localizeLabel?: boolean,
  localizeLabelParameters?: StringMap,
  placeholder?: string | LocalizationKey,
  localizePlaceholder?: boolean,
  localizePlaceholderParameters?: StringMap,
  value?: any,
  min?: string | number,
  max?: string | number,
  validator?: (value: any) => boolean
};

export type MessageBoxData<T = any> = {
  header?: string | LocalizationKey,
  localizeHeader?: boolean,
  localizeHeaderParameters?: StringMap,
  subHeader?: string | LocalizationKey,
  localizeSubHeader?: boolean,
  localizeSubHeaderParameters?: StringMap,
  message?: string | LocalizationKey,
  localizeMessage?: boolean,
  localizeMessageParameters?: StringMap,
  actions: MessageBoxAction<T>[],
  inputs?: StringMap<MessageBoxInput>,
  backdropDismiss?: boolean
};

export type NotifyData = {
  header?: string | LocalizationKey,
  message: string | LocalizationKey,
  localizeHeader?: boolean,
  localizeHeaderParameters?: StringMap,
  localizeMessage?: boolean,
  localizeMessageParameters?: StringMap,
  duration?: number
};

export abstract class NotificationService {
  abstract openMessageBox<T>(data: MessageBoxData<T>): Promise<MessageBoxResult<T>>;
  abstract notify(data: NotifyData): void;
}
