import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({
  name: 'pad',
  standalone: true
})
export class PadPipe implements PipeTransform {
  transform(input: string | number, length: number, fillString: string | number = ' ', position: 'start' | 'end' = 'start'): string {
    const inputType = typeof input;

    if (inputType != 'string' && inputType != 'number') {
      throw new Error(`Padding for type ${inputType} not supported.`);
    }

    const text = inputType == 'string' ? (input as string) : (input as number).toString();
    const pad = position == 'start' ? String.prototype.padStart.bind(text) : String.prototype.padEnd.bind(text);
    return pad(length, fillString.toString());
  }
}
