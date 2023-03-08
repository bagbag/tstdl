import type { Theme } from '#/theme/theme-service.js';
import { fromEntries, objectKeys } from '#/utils/object/object.js';
import { hyphenate } from '#/utils/string/hypenate.js';

export type TailwindPalette = {
  /* eslint-disable @typescript-eslint/naming-convention */
  DEFAULT: string,
  50: string,
  100: string,
  200: string,
  300: string,
  400: string,
  500: string,
  600: string,
  700: string,
  800: string,
  900: string
  /* eslint-enable @typescript-eslint/naming-convention */
};

export function generateTailwindColorsFromTheme(theme: Theme): Record<string, TailwindPalette> {
  const colors = objectKeys(theme.palette);
  return generateTailwindColorsFromThemeColors(colors);
}

export function generateTailwindColorsFromThemeColors(colors: readonly string[]): Record<string, TailwindPalette> {
  const entries = colors
    .map((color) => [color, generateTailwindPalette(color)] as const);

  return fromEntries(entries);
}

export function generateTailwindPalette(color: string): TailwindPalette {
  const colorVariable = hyphenate(color);

  return {
    /* eslint-disable @typescript-eslint/naming-convention */
    DEFAULT: `var(--theme-${colorVariable})`,
    50: `var(--theme-${colorVariable}-50)`,
    100: `var(--theme-${colorVariable}-100)`,
    200: `var(--theme-${colorVariable}-200)`,
    300: `var(--theme-${colorVariable}-300)`,
    400: `var(--theme-${colorVariable}-400)`,
    500: `var(--theme-${colorVariable}-500)`,
    600: `var(--theme-${colorVariable}-600)`,
    700: `var(--theme-${colorVariable}-700)`,
    800: `var(--theme-${colorVariable}-800)`,
    900: `var(--theme-${colorVariable}-900)`
    /* eslint-enable @typescript-eslint/naming-convention */
  };
}
