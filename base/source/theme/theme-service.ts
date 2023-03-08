import { inject, injectionToken, singleton } from '#/container/index.js';
import { createArray } from '#/utils/array/array.js';
import { memoize } from '#/utils/function/memoize';
import { fromEntries, objectEntries, objectKeys } from '#/utils/object/object.js';
import { isString } from '#/utils/type-guards.js';
import * as chroma from 'chroma-js';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

export type CalculatedPalette<Colors extends string = string> = {
  [Color in Colors]: ColorTones
};

export type CalculatedTheme<Colors extends string = string> = {
  palette: CalculatedPalette<Colors>
};

export type Theme<Colors extends string = string> = {
  palette: Palette<Colors>
};

export type Palette<Colors extends string = string> = { [Color in Colors]: string | ColorTones };

export type ColorTones = {
  /* eslint-disable @typescript-eslint/naming-convention */
  base: string,
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

export const themeColorTones = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const DEFAULT_THEME = injectionToken<Theme>('DEFAULT_THEME');

const calculateTheme = memoize(_calculateTheme, { weak: true });
const generateColorTones = memoize(_generateColorTones);

@singleton()
export class ThemeService<Colors extends string = string> {
  private readonly themeSubject: BehaviorSubject<Theme<Colors>>;
  private readonly calculatedThemeSubject: BehaviorSubject<CalculatedTheme<Colors>>;
  private readonly defaultTheme: Theme<Colors>;

  readonly colors: Colors[];
  readonly theme$: Observable<Theme<Colors>>;
  readonly calculatedTheme$: Observable<CalculatedTheme<Colors>>;

  get theme(): Theme<Colors> {
    return this.themeSubject.value;
  }

  get calculatedTheme(): CalculatedTheme<Colors> {
    return this.calculatedThemeSubject.value;
  }

  constructor(@inject(DEFAULT_THEME) defaultTheme: Theme<Colors>) {
    this.defaultTheme = defaultTheme;
    this.colors = objectKeys(defaultTheme.palette);

    this.themeSubject = new BehaviorSubject<Theme<Colors>>(undefined!);
    this.calculatedThemeSubject = new BehaviorSubject<CalculatedTheme<Colors>>(undefined!);

    this.theme$ = this.themeSubject.asObservable();
    this.calculatedTheme$ = this.calculatedThemeSubject.asObservable();

    this.setTheme(undefined);
  }

  setTheme(theme: Theme<Colors> | undefined): void {
    const newTheme = theme ?? this.defaultTheme;
    const calculatedTheme = calculateTheme(newTheme);

    this.themeSubject.next(newTheme);
    this.calculatedThemeSubject.next(calculatedTheme);
  }
}

function _calculateTheme<Colors extends string = string>(theme: Theme<Colors>): CalculatedTheme<Colors> {
  const paletteEntries = objectEntries(theme.palette)
    .map(([color, palette]) => [color, isString(palette) ? generateColorTones(palette) : palette]);

  return fromEntries(paletteEntries);
}

function _generateColorTones(base: string): ColorTones {
  const colors = generateColors(base, 10);

  return {
    base,
    50: colors[0]!,
    100: colors[1]!,
    200: colors[2]!,
    300: colors[3]!,
    400: colors[4]!,
    500: colors[5]!,
    600: colors[6]!,
    700: colors[7]!,
    800: colors[8]!,
    900: colors[9]!
  };
}

function generateColors(baseColor: string, colorCount: number, { bezier = true, correctLightness = true }: { bezier?: boolean, correctLightness?: boolean } = {}): string[] {
  const generatedColors = autoGradient(baseColor, colorCount);

  if (!bezier && !correctLightness) {
    return generatedColors.map((color) => color.hex());
  }

  const scale = (bezier ? chroma.bezier(generatedColors as any as string[]).scale() : chroma.scale(generatedColors));

  const colors = scale
    .correctLightness(correctLightness)
    .colors(colorCount);

  return colors;
}

function autoGradient(color: string, numColors: number): chroma.Color[] {
  const [, a, b] = chroma(color).lab();
  const step = 100 / (numColors + 1);

  return createArray(numColors, (i) => chroma.lab(100 - ((i + 1) * step), a, b));
}
