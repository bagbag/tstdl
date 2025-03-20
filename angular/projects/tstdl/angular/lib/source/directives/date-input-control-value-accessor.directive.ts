import { Directive, ElementRef, forwardRef, HostListener, inject, model } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isDate, isNumber, noop } from '@tstdl/base/utils';

@Directive({
  selector: 'input[type=date], input[type=datetime-local]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DateInputControlValueAccessor),
    multi: true
  }]
})
export class DateInputControlValueAccessor implements ControlValueAccessor {
  readonly #elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onTouched: () => void = noop;
  private onChange: (value: any) => void = noop;

  readonly valueType = model<'value' | 'valueAsNumber' | 'valueAsDate'>('value');

  @HostListener('blur', [])
  onBlur(): void {
    this.onTouched();
  }

  @HostListener('input', ['$event'])
  onInputChange(): void {
    this.onChange(this.#elementRef.nativeElement[this.valueType()]);
  }

  registerOnTouched(fn: typeof this.onTouched) {
    this.onTouched = fn;
  }

  registerOnChange(fn: typeof this.onChange) {
    this.onChange = fn;
  }

  writeValue(value: Date | string | number) {
    const valueType = isDate(value)
      ? 'valueAsDate'
      : isNumber(value)
        ? 'valueAsNumber'
        : 'value';

    this.valueType.set(valueType);

    if (valueType == 'valueAsDate') {
      this.#elementRef.nativeElement.valueAsDate = value as Date;
    }
    else if (valueType == 'valueAsNumber') {
      this.#elementRef.nativeElement.valueAsNumber = value as number;
    }
    else {
      this.#elementRef.nativeElement.value = value as string;
    }
  }
}
