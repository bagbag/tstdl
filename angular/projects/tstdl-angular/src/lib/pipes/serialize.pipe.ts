import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import type { SerializationOptions } from '@tstdl/base/serializer';
import { serialize } from '@tstdl/base/serializer';

@Pipe({
  name: 'serialize'
})
export class SerializePipe implements PipeTransform {
  transform(value: unknown, options?: SerializationOptions): unknown {
    return serialize(value, options);
  }
}
