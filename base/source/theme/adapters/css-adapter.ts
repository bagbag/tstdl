import { objectEntries } from '#/utils/object/object.js';
import { hyphenate } from '#/utils/string/hypenate.js';
import type { CalculatedPalette, ThemeService } from '../theme-service.js';
import { themeColorTones } from '../theme-service.js';

export interface CssThemeAdapter {
  destroy(): void;
}

export function cssThemeAdapter(themeService: ThemeService<any>): CssThemeAdapter {
  const styleSheet = new CSSStyleSheet();
  document.adoptedStyleSheets.push(styleSheet);

  const rootRule = createCssRule<CSSStyleRule>(styleSheet, ':root  {}');

  const subscription = themeService.calculatedTheme$.subscribe((theme) => setVariables(rootRule, theme.palette));

  return {
    destroy() {
      subscription.unsubscribe();
    }
  };
}

function setVariables(cssRule: CSSStyleRule, palette: CalculatedPalette): void {
  for (const [color, tones] of objectEntries(palette)) {
    const colorVariable = hyphenate(color);

    for (const tone of themeColorTones) {
      cssRule.style.setProperty(`--theme-${colorVariable}`, tones.base);
      cssRule.style.setProperty(`--theme-${colorVariable}-${tone}`, tones[tone]);
    }
  }
}

function createCssRule<T extends CSSRule = CSSRule>(styleSheet: CSSStyleSheet, rule: string): T {
  const index = styleSheet.insertRule(rule);
  return styleSheet.cssRules[index] as T;
}
