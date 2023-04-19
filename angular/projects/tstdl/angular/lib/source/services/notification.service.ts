import type { DynamicText } from '@tstdl/base/text';
import type { Record, SimplifyObject, TypedOmit } from '@tstdl/base/types';
import type { InputAttributes, InputMode, InputType } from '@tstdl/base/web-types';

export type MessageBoxInputs = Record<string, MessageBoxInput>;
export type MessageBoxResult<T = any, I extends MessageBoxInputs = MessageBoxInputs, D = never> =
  | { dismissed: false, actionValue: T, inputs: MessageBoxInputsOutput<I> }
  | { dismissed: true, actionValue: D, inputs: MessageBoxInputsOutput<I> };

export type MessageBoxInputsOutput<T extends MessageBoxInputs> = { [P in keyof T]: T[P]['required'] extends true ? MessageBoxInputOutput<T[P]> : (MessageBoxInputOutput<T[P]> | null) };

export type MessageBoxInputOutput<T extends MessageBoxInput> =
  | T extends MessageBoxTextInput ? string
  : T extends MessageBoxSelectInput<infer U> ? U
  : never;

export type MessageBoxAction<T = any, I extends MessageBoxInputs = MessageBoxInputs> = {
  text: DynamicText,
  value?: T,
  disableOnInvalidInputs?: boolean,
  handler?: (value: T, inputs: MessageBoxInputsOutput<I>) => any | Promise<any>
};

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

type MessageBoxInputBase<Type extends string> = { type: Type };

export type MessageBoxTextInput = MessageBoxInputBase<'text'> & {
  inputType?: InputType,
  mode?: InputMode,
  label?: DynamicText,
  placeholder?: DynamicText,
  initialValue?: any,
  required?: boolean,
  attributes?: TypedOmit<InputAttributes, 'type' | 'mode' | 'placeholder' | 'required' | 'value'>,
  validator?: (value: any) => boolean
};

export type MessageBoxSelectInputItem<T> = {
  label: DynamicText,
  value: T
};

export type MessageBoxSelectInput<T> = MessageBoxInputBase<'select'> & {
  label?: DynamicText,
  items: MessageBoxSelectInputItem<T>[],
  initialValue?: T,
  required?: boolean
};

export type MessageBoxInput<T = any> = MessageBoxTextInput | MessageBoxSelectInput<T>;

export type MessageBoxData<T = any, I extends MessageBoxInputs = MessageBoxInputs, D = never> = {
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
  abstract openMessageBox<T = never, I extends MessageBoxInputs = Record<never>, D = never>(data: MessageBoxData<T, I, D>): Promise<MessageBoxResult<T, I, D>>;
  abstract notify(data: NotifyData): void;
}

export function messageBoxTextInput<T extends TypedOmit<MessageBoxTextInput, 'type'>>(input: T): SimplifyObject<{ type: 'text' } & T> {
  return { type: 'text', ...input };
}

export function messageBoxSelectInput<T, U extends TypedOmit<MessageBoxSelectInput<T>, 'type'>>(input: U): SimplifyObject<{ type: 'select' } & U> {
  return { type: 'select', ...input };
}

export function isMessageBoxTextInput(input: MessageBoxInput): input is MessageBoxTextInput {
  return input.type == 'text';
}

export function isMessageBoxSelectInput<T>(input: MessageBoxInput<T>): input is MessageBoxSelectInput<T> {
  return input.type == 'select';
}
