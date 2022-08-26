import type { Record, TypedOmit } from '@tstdl/base/types';
import type { InputAttributes, InputMode, InputType } from '@tstdl/base/web-types';
import type { LocalizableText } from '../models';

export type MessageBoxInputs = Record<string, MessageBoxInput>;
export type MessageBoxResult<T = any, I extends MessageBoxInputs = MessageBoxInputs> = {
  actionValue: T,
  inputs: MessageBoxInputsOutput<I>
};

export type MessageBoxInputsOutput<T extends MessageBoxInputs> = { [P in keyof T]: T[P]['required'] extends true ? MessageBoxInputOutput<T[P]> : (MessageBoxInputOutput<T[P]> | undefined | null) };

export type MessageBoxInputOutput<T extends MessageBoxInput> =
  | T extends MessageBoxTextInput ? string
  : T extends MessageBoxSelectInput<infer U> ? U
  : never;

export type MessageBoxAction<T = any, I extends MessageBoxInputs = MessageBoxInputs> = {
  text: LocalizableText,
  value?: T,
  disableOnInvalidInputs?: boolean,
  handler?: (value: T, inputs: MessageBoxInputsOutput<I>) => any | Promise<any>
};

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type MessageBoxTextInputType = 'text';

export type MessageBoxSelectInputType = 'select';

export type MessageBoxInputType = MessageBoxTextInputType | MessageBoxSelectInputType;

type MessageBoxInputBase<Type extends MessageBoxInputType> = { type: Type };

export type MessageBoxTextInput = MessageBoxInputBase<MessageBoxTextInputType> & {
  inputType?: InputType,
  mode?: InputMode,
  label?: LocalizableText,
  placeholder?: LocalizableText,
  initialValue?: any,
  required?: boolean,
  attributes?: TypedOmit<InputAttributes, 'type' | 'mode' | 'placeholder' | 'required' | 'value'>,
  validator?: (value: any) => boolean
};

export type MessageBoxSelectInputItem<T> = {
  label: LocalizableText,
  value: T
};

export type MessageBoxSelectInput<T> = MessageBoxInputBase<MessageBoxSelectInputType> & {
  label?: LocalizableText,
  items?: MessageBoxSelectInputItem<T>[],
  initialValue?: T,
  required?: boolean
};

export type MessageBoxInput<T = any> = MessageBoxTextInput | MessageBoxSelectInput<T>;

export type MessageBoxData<T = any, I extends MessageBoxInputs = MessageBoxInputs> = {
  type?: NotificationType,
  header?: LocalizableText,
  subHeader?: LocalizableText,
  message?: LocalizableText,
  actions?: MessageBoxAction<T>[],
  inputs?: I,
  backdropDismiss?: boolean
};

export type NotifyData = {
  type?: NotificationType,
  header?: LocalizableText,
  message: LocalizableText,
  duration?: number
};

export abstract class NotificationService {
  abstract openMessageBox<T, I extends MessageBoxInputs>(data: MessageBoxData<T, I>): Promise<MessageBoxResult<T, I>>;
  abstract notify(data: NotifyData): void;
}

export function isMessageBoxTextInput(messageBoxInput: MessageBoxInput): messageBoxInput is MessageBoxTextInput {
  return messageBoxInput.type == 'text';
}

export function isMessageBoxSelectInput<T>(messageBoxInput: MessageBoxInput<T>): messageBoxInput is MessageBoxSelectInput<T> {
  return messageBoxInput.type == 'select';
}
