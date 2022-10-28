import type { Theme } from '#/css/theme';
import { objectEntries } from '#/utils/object/object';
import { isString } from '#/utils/type-guards';

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

export function generateTailwindColors(theme: Theme): Record<string, TailwindPalette> {
  const entries = objectEntries(theme.colors)
    .map(([colorName, value]) => {
      const name = isString(value) ? colorName : (value.name ?? colorName);
      return [name, generateTailwindPalette(name)];
    });

  return Object.fromEntries(entries) as Record<string, TailwindPalette>;
}

export function generateTailwindPalette(name: string): TailwindPalette {
  return {
    /* eslint-disable @typescript-eslint/naming-convention */
    DEFAULT: `var(--color-${name})`,
    50: `var(--color-${name}-50)`,
    100: `var(--color-${name}-100)`,
    200: `var(--color-${name}-200)`,
    300: `var(--color-${name}-300)`,
    400: `var(--color-${name}-400)`,
    500: `var(--color-${name}-500)`,
    600: `var(--color-${name}-600)`,
    700: `var(--color-${name}-700)`,
    800: `var(--color-${name}-800)`,
    900: `var(--color-${name}-900)`
    /* eslint-enable @typescript-eslint/naming-convention */
  };
}
