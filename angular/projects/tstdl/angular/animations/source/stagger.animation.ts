import type { AnimationTriggerMetadata } from '@angular/animations';
import { animateChild, query, stagger, transition, trigger } from '@angular/animations';

export function staggerAnimation(timing: number): AnimationTriggerMetadata {
  return trigger('stagger', [
    transition('* => *', [
      query(':enter', stagger(timing, animateChild()), { optional: true })
    ])
  ]);
}
