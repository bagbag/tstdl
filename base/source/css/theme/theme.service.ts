import { inject, singleton } from '#/container';
import { DOCUMENT } from '#/tokens';
import { objectEntries } from '#/utils/object/object';
import { isDefined, isString } from '#/utils/type-guards';
import * as chroma from 'chroma-js';
import type { Theme } from './theme.model';

@singleton()
export class ThemeService {
  private readonly styleElement: HTMLStyleElement;

  constructor(@inject(DOCUMENT) document: Document) {
    this.styleElement = document.createElement('style');
    document.head.appendChild(this.styleElement);
  }

  setTheme(theme: Theme, darkTheme?: Theme): void {
    const lightRules = buildThemeRules(theme);
    const darkRules = isDefined(darkTheme) ? buildThemeRules(darkTheme) : [];
    const lightRulesString = lightRules.join('\n');
    const darkRulesString = darkRules.join('\n');

    this.styleElement.innerHTML = `
@media (prefers-color-scheme: light) {
  :root, .light {
    ${lightRulesString}
  }

  .dark {
    ${darkRulesString}
  }
}

@media (prefers-color-scheme: dark) {
  :root, .dark {
    ${darkRulesString}
  }

  .light {
    ${lightRulesString}
  }
}
`;
  }
}

function buildThemeRules(theme: Theme): string[] {
  const rules: string[] = [];

  for (const [colorName, value] of objectEntries(theme.colors)) {
    const name = isString(value) ? colorName : (value.name ?? colorName);
    const color = isString(value) ? value : value.color;

    const colorRules = generatePaletteVariableDeclarations(name, color);
    rules.push(...colorRules);
  }

  return rules;
}

function generatePaletteVariableDeclarations(paletteName: string, color: string): string[] {
  const chromaColor = chroma(color);
  const [hue, saturation, lightness] = chromaColor.hsl();

  const colors = {
    50: chroma.hsl(hue, saturation, lightness + 0.50).css(),
    100: chroma.hsl(hue, saturation, lightness + 0.40).css(),
    200: chroma.hsl(hue, saturation, lightness + 0.30).css(),
    300: chroma.hsl(hue, saturation, lightness + 0.20).css(),
    400: chroma.hsl(hue, saturation, lightness + 0.10).css(),
    500: chromaColor.css(),
    600: chroma.hsl(hue, saturation, lightness - 0.10).css(),
    700: chroma.hsl(hue, saturation, lightness - 0.20).css(),
    800: chroma.hsl(hue, saturation, lightness - 0.30).css(),
    900: chroma.hsl(hue, saturation, lightness - 0.40).css()
  };

  const colorEntries = objectEntries(colors);
  const variables = [[`--color-${paletteName}`, colors[500]], ...colorEntries.map(([number, numberColor]) => [`--color-${paletteName}-${number}`, numberColor] as const)];
  const variableDeclarations = variables.map(([name, value]) => `${name}: ${value};`);

  return variableDeclarations;
}
