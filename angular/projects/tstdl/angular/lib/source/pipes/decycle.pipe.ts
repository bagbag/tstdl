import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { decycle } from '@tstdl/base/utils/object';

@Pipe({
  name: 'decycle',
  standalone: true
})
export class DecyclePipe implements PipeTransform {
  transform(value: unknown, replacer?: (value: any) => any): unknown {
    return decycle(value, replacer);
  }
}
