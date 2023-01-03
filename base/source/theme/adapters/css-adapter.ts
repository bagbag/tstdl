import { objectEntries } from '#/utils/object';
import { hyphenate } from '#/utils/string';
import { isDefined } from '#/utils/type-guards';
import type { CalculatedPalette, ThemeService } from '../theme-service';
import { themeColorTones } from '../theme-service';

export interface CssThemeAdapter {
  destroy(): void;
}

export function cssThemeAdapter(themeService: ThemeService<any>): CssThemeAdapter {
  const variablesStyleElement = document.createElement('style');
  const classesStyleElement = document.createElement('style');

  const classes = generateClasses(themeService.colors);
  classesStyleElement.innerHTML = classes.join('\n');

  themeService.calculatedTheme$.subscribe((theme) => {
    const variables = generateVariables(theme.palette);

    variablesStyleElement.innerHTML = `:root {
  ${variables.join('\n')}
}`;
  });

  document.head.appendChild(variablesStyleElement);
  document.head.appendChild(classesStyleElement);

  return {
    destroy() {
      variablesStyleElement.remove();
      classesStyleElement.remove();
    }
  };
}

function generateVariables(palette: CalculatedPalette): string[] {
  const entries = objectEntries(palette);

  return entries.flatMap(([color, { main, text, border }]) => [
    `--color-${hyphenate(color)}: ${main.base};`,
    ...themeColorTones.map((tone) => `--color-${hyphenate(color)}-${tone}: ${main[tone]};`),

    `--color-${hyphenate(color)}-text: ${text.base};`,
    ...themeColorTones.map((tone) => `--color-${hyphenate(color)}-text-${tone}: ${text[tone]};`),

    isDefined(border) ? `--color-${hyphenate(color)}-border: ${border.base};` : undefined,
    ...(isDefined(border) ? themeColorTones.map((tone) => `--color-${hyphenate(color)}-border-${tone}: ${border[tone]};`) : [])
  ])
    .filter(isDefined);
}

function generateClasses(colors: string[]): string[] {
  const classes: string[] = [];

  for (const color of colors) {
    classes.push(
      `.theme-color-${color} {
  background-color: var(--color-${hyphenate(color)});
  color: var(--color-${hyphenate(color)}-text);
  border-color: var(--color-${hyphenate(color)}-border);
}`
    );

    for (const tone of themeColorTones) {
      classes.push(
        `.theme-color-${color}-${tone} {
  background-color: var(--color-${hyphenate(color)}-${tone});
  color: var(--color-${hyphenate(color)}-text-${tone});
  border-color: var(--color-${hyphenate(color)}-border-${tone});
}`
      );
    }
  }

  return classes;
}
