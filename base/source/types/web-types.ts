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

export type InputMode = 'decimal' | 'email' | 'none' | 'numeric' | 'search' | 'tel' | 'text' | 'url';

export type InputAutocomplete =
  | 'off'
  | 'on'
  | 'name'
  | 'honorific-prefix'
  | 'given-name'
  | 'additional-name'
  | 'family-name'
  | 'honorific-suffix'
  | 'nickname'
  | 'email'
  | 'username'
  | 'new-password'
  | 'current-password'
  | 'one-time-code'
  | 'organization-title'
  | 'organization'
  | 'street-address'
  | 'address-line1'
  | 'address-line2'
  | 'address-line3'
  | 'address-level4'
  | 'address-level3'
  | 'address-level2'
  | 'address-level1'
  | 'country'
  | 'country-name'
  | 'postal-code'
  | 'cc-name'
  | 'cc-given-name'
  | 'cc-additional-name'
  | 'cc-family-name'
  | 'cc-number'
  | 'cc-exp'
  | 'cc-exp-month'
  | 'cc-exp-year'
  | 'cc-csc'
  | 'cc-type'
  | 'transaction-currency'
  | 'transaction-amount'
  | 'language'
  | 'bday'
  | 'bday-day'
  | 'bday-month'
  | 'bday-year'
  | 'sex'
  | 'tel'
  | 'tel-country-code'
  | 'tel-national'
  | 'tel-area-code'
  | 'tel-local'
  | 'tel-extension'
  | 'impp'
  | 'url'
  | 'photo';

export type InputAttributes = {
  accept?: string,
  autocomplete?: InputAutocomplete,
  autofocus?: boolean,
  capture?: 'user' | 'environment',
  checked?: boolean,
  disabled?: boolean,
  id?: string,
  list?: string,
  max?: number | string,
  maxlength?: number,
  min?: number | string,
  minlength?: number,
  mode?: InputMode,
  multiple?: boolean,
  name?: string,
  pattern?: string,
  placeholder?: string,
  readonly?: boolean,
  required?: boolean,
  step?: number,
  title?: string,
  type?: InputType,
  value?: any
};

export type TextAreaAttributes = {
  autocomplete?: InputAutocomplete,
  autofocus?: boolean,
  cols?: number,
  rows?: number,
  maxlength?: number,
  minlength?: number,
  name?: string,
  disabled?: boolean,
  id?: string,
  placeholder?: string,
  readonly?: boolean,
  required?: boolean,
  wrap?: 'hard' | 'soft' | 'off'
};
