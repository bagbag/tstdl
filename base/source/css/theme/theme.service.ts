import { inject, singleton } from '#/container';
import { DOCUMENT } from '#/tokens';
import { createArray } from '#/utils/array/array';
import { isDefined, isString } from '#/utils/type-guards';
import * as chroma from 'chroma-js';
import type { Theme } from './theme.model';

const paletteNumbers = [50, ...createArray(9, (index) => (100 + (100 * index)))];

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

  for (const [colorName, value] of Object.entries(theme.colors)) {
    const name = isString(value) ? colorName : (value.name ?? colorName);
    const color = isString(value) ? value : value.color;

    const colorRules = generatePaletteVariableDeclarations(name, theme.isDark ?? false, color);
    rules.push(...colorRules);
  }

  return rules;
}

function generatePaletteVariableDeclarations(paletteName: string, isDark: boolean, color: string): string[] {
  const baseColor = isDark ? 'black' : 'white';
  const colors = chroma.scale([baseColor, color]).colors(paletteNumbers.length);
  const variables = [[`--color-${paletteName}`, color], ...paletteNumbers.map((number, index) => [`--color-${paletteName}-${number}`, colors[index]] as const)];
  const variableDeclarations = variables.map(([name, value]) => `${name}: ${value};`);

  return variableDeclarations;
}
