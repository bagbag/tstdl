import type { Theme } from '#/theme/theme-service.js';
import { fromEntries, objectKeys } from '#/utils/object/object.js';
import { hyphenate } from '#/utils/string/hypenate.js';
import { isDefined } from '#/utils/type-guards';

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

export function generateTailwindColorsFromTheme(theme: Theme, tailwindNamePrefix?: string): Record<string, TailwindPalette> {
  const colors = objectKeys(theme.palette);
  return generateTailwindColorsFromThemeColors(colors, tailwindNamePrefix);
}

export function generateTailwindColorsFromThemeColors(colors: readonly string[], tailwindNamePrefix?: string): Record<string, TailwindPalette> {
  const prefix = isDefined(tailwindNamePrefix) ? `${tailwindNamePrefix}-` : '';

  const entries = colors
    .map(hyphenate)
    .map((color) => [`${prefix}${color}`, generateTailwindPalette(color)] as const);

  return fromEntries(entries);
}

export function generateTailwindPalette(color: string): TailwindPalette {
  return {
    /* eslint-disable @typescript-eslint/naming-convention */
    DEFAULT: `var(--theme-${color})`,
    50: `var(--theme-${color}-50)`,
    100: `var(--theme-${color}-100)`,
    200: `var(--theme-${color}-200)`,
    300: `var(--theme-${color}-300)`,
    400: `var(--theme-${color}-400)`,
    500: `var(--theme-${color}-500)`,
    600: `var(--theme-${color}-600)`,
    700: `var(--theme-${color}-700)`,
    800: `var(--theme-${color}-800)`,
    900: `var(--theme-${color}-900)`
    /* eslint-enable @typescript-eslint/naming-convention */
  };
}
