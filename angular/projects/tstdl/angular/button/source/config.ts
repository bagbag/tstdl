
import type { Provider } from '@angular/core';
import type { ValueOrProvider } from '@tstdl/base/utils';

import type { ButtonColor, ButtonDesign, ButtonSize } from './button.component';

export class TstdlButtonConfig {
  default?: {
    design?: ValueOrProvider<ButtonDesign>,
    color?: ValueOrProvider<ButtonColor>,
    size?: ValueOrProvider<ButtonSize>,
    coloredText?: ValueOrProvider<boolean>
  };
}

export function provideTstdlButtonConfig(config: TstdlButtonConfig): Provider {
  return { provide: TstdlButtonConfig, useValue: config };
}
