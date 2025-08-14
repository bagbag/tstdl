import type { DynamicText } from '@tstdl/base/text';
import type { Record, SimplifyObject, TypedOmit } from '@tstdl/base/types';
import type { InputAttributes, InputMode, InputType, TextAreaAttributes } from '@tstdl/base/types';

export type MessageBoxInputs = Record<string, MessageBoxInput>;
export type MessageBoxResult<T = any, I extends MessageBoxInputs = MessageBoxInputs, D = undefined> =
  | { dismissed: false, actionValue: T, inputs: MessageBoxInputsOutput<I> }
  | { dismissed: true, actionValue: D, inputs: MessageBoxInputsOutput<I> };

export type MessageBoxInputsOutput<T extends MessageBoxInputs> = { [P in keyof T]: T[P]['required'] extends true ? MessageBoxInputOutput<T[P]> : (MessageBoxInputOutput<T[P]> | null) };

export type MessageBoxInputOutput<T extends MessageBoxInput> =
  | T extends (MessageBoxTextInput | MessageBoxTextAreaInput) ? string
  : T extends MessageBoxSelectInput<infer U> ? U
  : never;

export type MessageBoxAction<T = any, I extends MessageBoxInputs = MessageBoxInputs> = {
  text: DynamicText,
  value?: T,
  disableOnInvalidInputs?: boolean,
  handler?: (value: T, inputs: MessageBoxInputsOutput<I>) => any | Promise<any>
};

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

type MessageBoxInputBase<Type extends string> = {
  type: Type,
  enabled?: boolean,
  required?: boolean
};

export type MessageBoxTextInput = MessageBoxInputBase<'text'> & {
  inputType?: InputType,
  mode?: InputMode,
  label?: DynamicText,
  placeholder?: DynamicText,
  initialValue?: any,
  pattern?: string | RegExp,
  attributes?: TypedOmit<InputAttributes, 'type' | 'mode' | 'placeholder' | 'required' | 'value' | 'pattern'>,
  validator?: (value: any) => boolean
};

export type MessageBoxTextAreaInput = MessageBoxInputBase<'text-area'> & {
  label?: DynamicText,
  placeholder?: DynamicText,
  initialValue?: any,
  pattern?: string | RegExp,
  attributes?: TypedOmit<TextAreaAttributes, 'placeholder' | 'required'>,
  validator?: (value: any) => boolean
};

export type MessageBoxSelectInputItem<T> = {
  label: DynamicText,
  value: T
};

export type MessageBoxSelectInput<T> = MessageBoxInputBase<'select'> & {
  items: MessageBoxSelectInputItem<T>[],
  label?: DynamicText,
  initialValue?: T
};

export type MessageBoxInput<T = any> = MessageBoxTextInput | MessageBoxTextAreaInput | MessageBoxSelectInput<T>;

export type MessageBoxData<T = any, I extends MessageBoxInputs = MessageBoxInputs, D = undefined> = {
  type?: NotificationType,
  header?: DynamicText,
  subHeader?: DynamicText,
  message?: DynamicText,
  actions?: MessageBoxAction<T, I>[],
  inputs?: I,
  dismiss?: D
};

export type NotifyData = {
  type?: NotificationType,
  header?: DynamicText,
  message: DynamicText,
  duration?: number
};

export abstract class NotificationService {
  abstract openMessageBox<T = never, I extends MessageBoxInputs = Record<never>, D = undefined>(data: MessageBoxData<T, I, D>): Promise<MessageBoxResult<T, I, D>>;
  abstract notify(data: NotifyData): void;
}

export function messageBoxTextInput<T extends TypedOmit<MessageBoxTextInput, 'type'>>(input: T): SimplifyObject<{ type: 'text' } & T> {
  return { type: 'text', ...input };
}

export function messageBoxTextAreaInput<T extends TypedOmit<MessageBoxTextAreaInput, 'type'>>(input: T): SimplifyObject<{ type: 'text-area' } & T> {
  return { type: 'text-area', ...input };
}

export function messageBoxSelectInput<T, U extends TypedOmit<MessageBoxSelectInput<T>, 'type'>>(input: U): SimplifyObject<{ type: 'select' } & U> {
  return { type: 'select', ...input };
}

export function isMessageBoxTextInput(input: MessageBoxInput): input is MessageBoxTextInput {
  return input.type == 'text';
}

export function isMessageBoxTextAreaInput(input: MessageBoxInput): input is MessageBoxTextAreaInput {
  return input.type == 'text-area';
}

export function isMessageBoxSelectInput<T>(input: MessageBoxInput<T>): input is MessageBoxSelectInput<T> {
  return input.type == 'select';
}
