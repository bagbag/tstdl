import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pad'
})
export class PadPipe implements PipeTransform {
  transform(input: string | number, length: number, fillString: string | number = ' ', position: 'start' | 'end' = 'start'): string {
    const inputType = typeof input;

    if (inputType != 'string' && inputType != 'number') {
      throw new Error(`padding for type ${inputType} not supported`);
    }

    const text = inputType == 'string' ? (input as string) : (input as number).toString();
    const pad = (position == 'start' ? String.prototype.padStart : String.prototype.padEnd).bind(text);
    return pad(length, fillString.toString());
  }
}
