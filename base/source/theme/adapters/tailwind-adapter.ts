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
    DEFAULT: `rgb(var(--theme-${color}-rgb) / <alpha-value>)`,
    50: `rgb(var(--theme-${color}-50-rgb) / <alpha-value>)`,
    100: `rgb(var(--theme-${color}-100-rgb) / <alpha-value>)`,
    200: `rgb(var(--theme-${color}-200-rgb) / <alpha-value>)`,
    300: `rgb(var(--theme-${color}-300-rgb) / <alpha-value>)`,
    400: `rgb(var(--theme-${color}-400-rgb) / <alpha-value>)`,
    500: `rgb(var(--theme-${color}-500-rgb) / <alpha-value>)`,
    600: `rgb(var(--theme-${color}-600-rgb) / <alpha-value>)`,
    700: `rgb(var(--theme-${color}-700-rgb) / <alpha-value>)`,
    800: `rgb(var(--theme-${color}-800-rgb) / <alpha-value>)`,
    900: `rgb(var(--theme-${color}-900-rgb) / <alpha-value>)`
    /* eslint-enable @typescript-eslint/naming-convention */
  };
}
