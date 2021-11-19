import { Pipe } from '@angular/core';
import { isString } from '@tstdl/base/cjs/utils';
import type { LocalizationData, LocalizationKey } from '../services';
import { LocalizePipe } from './localize.pipe';

@Pipe({
  name: 'optionalLocalize',
  pure: false
})
export class OptionalLocalizePipe extends LocalizePipe {
  override transform(text: string): string;
  override transform(localizationKey: LocalizationKey<void>): string;
  override transform<Parameters>(localizationData: LocalizationData<Parameters>): string;
  override transform<Parameters>(localizationKey: LocalizationKey<Parameters>, parameters: Parameters): string;
  override transform<Parameters>(localizationDataOrKeyOrString: LocalizationData<Parameters> | string, parametersOrNothing?: Parameters): string | null {
    if (isString(localizationDataOrKeyOrString)) {
      return localizationDataOrKeyOrString;
    }

    return super.transform(localizationDataOrKeyOrString as LocalizationKey, parametersOrNothing as any);
  }
}
