import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { decycle } from '@tstdl/base/utils';

@Pipe({
  name: 'decycle'
})
export class DecyclePipe implements PipeTransform {
  transform(value: unknown, replacer?: (value: any) => any): unknown {
    return decycle(value, replacer);
  }
}
