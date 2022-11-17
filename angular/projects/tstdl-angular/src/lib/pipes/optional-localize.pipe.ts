import { Pipe } from '@angular/core';
import type { LocalizationData, LocalizationKey } from '@tstdl/base/text';
import { isString } from '@tstdl/base/utils';
import { LocalizePipe } from './localize.pipe';

@Pipe({
  name: 'optionalLocalize',
  pure: false,
  standalone: true
})
export class OptionalLocalizePipe extends LocalizePipe {
  override transform(localizationKeyOrString: LocalizationKey | string | null): string | null;
  override transform<Parameters>(localizationDataOrString: LocalizationData<Parameters> | string | null): string | null;
  override transform<Parameters>(localizationKeyOrString: LocalizationKey<Parameters> | string | null, parameters: Parameters): string | null;
  override transform<Parameters>(localizationDataOrKeyOrString: LocalizationData<Parameters> | string | null, parametersOrNothing?: Parameters): string | null {
    if (isString(localizationDataOrKeyOrString)) {
      return localizationDataOrKeyOrString;
    }

    return super.transform(localizationDataOrKeyOrString as LocalizationKey, parametersOrNothing as any);
  }
}
