import type { Record, Simplify, TypedOmit } from '@tstdl/base/types';
import type { InputAttributes } from '@tstdl/base/web-types';
import type { LocalizableText } from '../models';

export type MessageBoxInputs = Record<string, MessageBoxInput>;
export type MessageBoxResult<T = any, I extends MessageBoxInputs = MessageBoxInputs> = Simplify<{
  actionValue: T,
  inputs: Simplify<MessageBoxInputsOutput<I>>
}>;

export type MessageBoxInputsOutput<T extends MessageBoxInputs> = Simplify<{ [P in keyof T]: MessageBoxInputOutput<T[P]> }>;

export type MessageBoxInputOutput<T extends MessageBoxInput> = Simplify<
  | undefined
  | (
    | T extends MessageBoxTextInput ? string
    : T extends MessageBoxSelectInput<infer U> ? U
    : never
  )>;

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
  label?: LocalizableText,
  placeholder?: LocalizableText,
  initialValue?: any,
  attributes?: TypedOmit<InputAttributes, 'placeholder'>,
  validator?: (value: any) => boolean
};

export type MessageBoxSelectInputItem<T> = {
  label: LocalizableText,
  value: T
};

export type MessageBoxSelectInput<T> = MessageBoxInputBase<MessageBoxSelectInputType> & {
  label?: LocalizableText,
  items?: MessageBoxSelectInputItem<T>[],
  initialSelection?: T,
  required?: boolean
};

export type MessageBoxInput<T = any> = MessageBoxTextInput | MessageBoxSelectInput<T>;

export type MessageBoxData<R = any, I extends MessageBoxInputs = MessageBoxInputs> = {
  type?: NotificationType,
  header?: LocalizableText,
  subHeader?: LocalizableText,
  message?: LocalizableText,
  actions?: MessageBoxAction<R>[],
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
  abstract openMessageBox<R, I extends MessageBoxInputs>(data: MessageBoxData<R, I>): Promise<MessageBoxResult<R, I>>;
  abstract notify(data: NotifyData): void;
}

export function isMessageBoxTextInput(messageBoxInput: MessageBoxInput): messageBoxInput is MessageBoxTextInput {
  return messageBoxInput.type == 'text';
}

export function isMessageBoxSelectInput<T>(messageBoxInput: MessageBoxInput<T>): messageBoxInput is MessageBoxSelectInput<T> {
  return messageBoxInput.type == 'select';
}
