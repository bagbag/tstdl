import type { StringMap } from '@tstdl/base/cjs/types';

export type MessageBoxResult<T = any> = {
  actionValue?: T,
  inputs: StringMap
};

export type MessageBoxAction<T = any> = {
  text: string,
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
  label?: string,
  localizeLabel?: boolean,
  localizeLabelParameters?: StringMap,
  placeholder?: string,
  localizePlaceholder?: boolean,
  localizePlaceholderParameters?: StringMap,
  value?: any,
  min?: string | number,
  max?: string | number,
  validator?: (value: any) => boolean
};

export type MessageBoxData<T = any> = {
  header?: string,
  localizeHeader?: boolean,
  localizeHeaderParameters?: StringMap,
  subHeader?: string,
  localizeSubHeader?: boolean,
  localizeSubHeaderParameters?: StringMap,
  message?: string,
  localizeMessage?: boolean,
  localizeMessageParameters?: StringMap,
  actions: MessageBoxAction<T>[],
  inputs?: StringMap<MessageBoxInput>,
  backdropDismiss?: boolean
};

export type NotifyData = {
  header?: string,
  message: string,
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
