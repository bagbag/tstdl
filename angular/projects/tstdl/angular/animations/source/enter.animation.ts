import { AUTO_STYLE, animate, state, style, transition, trigger, type AnimationTriggerMetadata } from '@angular/animations';
import { isBoolean } from '@tstdl/base/utils';
import { filterUndefinedObjectProperties, mapObjectValues } from '@tstdl/base/utils/object';

export type EnterAnimationOptions = {
  height?: boolean,
  opacity?: boolean,
  scale?: boolean | number
};

export function enterAnimation({ timing = '350ms ease', height, opacity, scale }: { timing?: string } & EnterAnimationOptions = {}): AnimationTriggerMetadata {
  const voidStyle = filterUndefinedObjectProperties({
    height: (height != false) ? '0px' : undefined,
    opacity: (opacity != false) ? 0 : undefined,
    scale: (scale != false) ? (isBoolean(scale) ? 0 : scale) : undefined,
    visibility: 'hidden'
  });

  const targetStyle = mapObjectValues(voidStyle, () => AUTO_STYLE);

  return trigger('enter', [
    state('void', style(voidStyle)),
    state('*', style(targetStyle)),
    transition('* <=> *', animate(timing))
  ]);
}
