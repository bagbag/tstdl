import { inject, injectionToken, singleton } from '#/container';
import type { UnionToTuple } from '#/types';
import { createArray } from '#/utils/array/array';
import { first } from '#/utils/iterable-helpers/first';
import { sort } from '#/utils/iterable-helpers/sort';
import { objectEntries, objectKeys } from '#/utils/object/object';
import { isDefined, isObject, isString } from '#/utils/type-guards';
import * as chroma from 'chroma-js';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

export type CalculatedPalette<Colors extends string = string> = {
  [Color in Colors]: {
    main: ColorTones,
    text: ColorTones,
    border?: ColorTones
  };
};

export type CalculatedTheme<Colors extends string = string> = {
  name: string,
  palette: CalculatedPalette<Colors>
};

export type PaletteColor = string | {
  main: string,
  text?: string,
  border?: string
};

export type Theme<Colors extends string = string> = {
  name: string,
  textColors?: string[],
  palette: Palette<Colors>
};

export type Palette<Colors extends string = string> = { [Color in Colors]: PaletteColor };

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

const white = chroma('white');
const black = chroma('black');

export const themeColorTones = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const DEFAULT_THEME = injectionToken('DEFAULT_THEME');

@singleton()
export class ThemeService<Colors extends string = string> {
  private readonly themeSubject: BehaviorSubject<Theme<Colors>>;
  private readonly calculatedThemeSubject: BehaviorSubject<CalculatedTheme<Colors>>;
  private readonly defaultTheme: Theme<Colors>;

  readonly colors: UnionToTuple<Colors>;
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
    this.colors = objectKeys(defaultTheme.palette) as typeof this['colors'];

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

function getTextColor(textColors: (string | chroma.Color)[], color: string | chroma.Color): string {
  return first(sort(textColors, (a, b) => chroma.contrast(color, b) - chroma.contrast(color, a)));
}

function calculateTheme<Colors extends string = string>(theme: Theme<Colors>): CalculatedTheme<Colors> {
  const entries = objectEntries(theme.palette);

  const calculatedTheme: CalculatedTheme<Colors> = {
    name: theme.name,
    palette: {} as CalculatedPalette<Colors>
  };

  const textColors = (isDefined(theme.textColors) && (theme.textColors.length > 0)) ? theme.textColors : [black, white];

  for (const [color, palette] of entries) {
    const mainBase = isString(palette) ? palette : palette.main;
    const textBase = (isObject(palette) ? palette.text : undefined) ?? getTextColor(textColors, mainBase);
    const borderBase = isString(palette) ? undefined : palette.border;

    const mainTones = generateColorTones(mainBase);

    calculatedTheme.palette[color] = {
      main: mainTones,
      text: generateTextColorTones(textBase, textColors, mainTones),
      border: isDefined(borderBase) ? generateColorTones(borderBase) : undefined
    };
  }

  return calculatedTheme;
}

function generateColorTones(base: string | chroma.Color): ColorTones {
  const colors = generateColors(base, 10);

  return {
    base: isString(base) ? base : base.hex(),
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

function generateTextColorTones(textBaseColor: string, textColors: (string | chroma.Color)[], tones: ColorTones): ColorTones {
  return {
    base: textBaseColor,
    50: getTextColor(textColors, tones[50]),
    100: getTextColor(textColors, tones[100]),
    200: getTextColor(textColors, tones[200]),
    300: getTextColor(textColors, tones[300]),
    400: getTextColor(textColors, tones[400]),
    500: getTextColor(textColors, tones[500]),
    600: getTextColor(textColors, tones[600]),
    700: getTextColor(textColors, tones[700]),
    800: getTextColor(textColors, tones[800]),
    900: getTextColor(textColors, tones[900])
  };
}

function generateColors(baseColor: string | chroma.Color, colorCount: number, { bezier = true, correctLightness = true }: { bezier?: boolean, correctLightness?: boolean } = {}): string[] {
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

function autoGradient(color: string | chroma.Color, numColors: number): chroma.Color[] {
  const [, a, b] = chroma(color).lab();
  const step = 100 / (numColors + 1);

  return createArray(numColors, (i) => chroma.lab(100 - ((i + 1) * step), a, b));
}
