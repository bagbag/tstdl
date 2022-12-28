import { objectEntries } from '#/utils/object';
import { hyphenate } from '#/utils/string';
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

  return entries.flatMap(([color, { main, contrast }]) => [
    `--color-${hyphenate(color)}: ${main.base};`,
    ...themeColorTones.map((tone) => `--color-${hyphenate(color)}-${tone}: ${main[tone]};`),

    `--color-${hyphenate(color)}-contrast: ${contrast.base};`,
    ...themeColorTones.map((tone) => `--color-${hyphenate(color)}-contrast-${tone}: ${contrast[tone]};`)
  ]);
}

function generateClasses(colors: string[]): string[] {
  const classes: string[] = [];

  for (const color of colors) {
    classes.push(
      `.theme-color-${color} {
  background-color: var(--color-${hyphenate(color)});
  color: var(--color-${hyphenate(color)}-contrast);
}`
    );

    for (const tone of themeColorTones) {
      classes.push(
        `.theme-color-${color}-${tone} {
  background-color: var(--color-${hyphenate(color)}-${tone});
  color: var(--color-${hyphenate(color)}-contrast-${tone});
}`
      );
    }
  }

  return classes;
}
