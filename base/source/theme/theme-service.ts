import { singleton } from '#/container';
import type { UnionToTuple } from '#/types';
import { createArray } from '#/utils/array/array';
import { objectEntries, objectKeys } from '#/utils/object/object';
import { isDefined, isObject, isString } from '#/utils/type-guards';
import * as chroma from 'chroma-js';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

export type CalculatedPalette<Colors extends string = string> = {
  [Color in Colors]: {
    main: ColorTones,
    contrast: ColorTones
  };
};

export type CalculatedTheme<Colors extends string = string> = {
  name: string,
  palette: CalculatedPalette<Colors>
};

export type PaletteColor = string | {
  main: string,
  contrast?: string
};

export type Theme<Colors extends string = string> = {
  name: string,
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

  constructor(defaultTheme: Theme<Colors>) {
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

function getContrastColor(color: string | chroma.Color): string {
  const contrastWhite = chroma.contrast(color, white);
  const contrastBlack = chroma.contrast(color, black);

  return (contrastWhite > contrastBlack) ? '#ffffff' : '#000000';
}

function calculateTheme<Colors extends string = string>(theme: Theme<Colors>): CalculatedTheme<Colors> {
  const entries = objectEntries(theme.palette);

  const calculatedTheme: CalculatedTheme<Colors> = {
    name: theme.name,
    palette: {} as CalculatedPalette<Colors>
  };

  for (const [color, palette] of entries) {
    const mainBase = isString(palette) ? palette : palette.main;
    const contrastBase = (isObject(palette) ? palette.contrast : undefined) ?? getContrastColor(mainBase);

    const mainTones = generateColorTones(mainBase);

    calculatedTheme.palette[color] = {
      main: mainTones,
      contrast: generateContrastColorTones(contrastBase, mainTones)
    };
  }

  return calculatedTheme;
}

function generateColorTones(base: string | chroma.Color): ColorTones {
  const colors = generateColors([base], undefined, 10, true, true);

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

function generateContrastColorTones(base: string | chroma.Color, tones: ColorTones): ColorTones {
  return {
    base: isString(base) ? base : base.hex(),
    50: getContrastColor(tones[50]),
    100: getContrastColor(tones[100]),
    200: getContrastColor(tones[200]),
    300: getContrastColor(tones[300]),
    400: getContrastColor(tones[400]),
    500: getContrastColor(tones[500]),
    600: getContrastColor(tones[600]),
    700: getContrastColor(tones[700]),
    800: getContrastColor(tones[800]),
    900: getContrastColor(tones[900])
  };
}

/**
 * stolen from <https://github.com/gka/palettes/blob/master/src/PalettePreview.svelte>
 */
function generateColors(baseColors: (string | chroma.Color)[], divergingColors: (string | chroma.Color)[] | undefined, colorCount: number, bezier: boolean, correctLightness: boolean): string[] {
  const diverging = isDefined(divergingColors) && (divergingColors.length > 0);
  const even = (colorCount % 2) == 0;
  const numColorsLeft = diverging ? Math.ceil(colorCount / 2) + (even ? 1 : 0) : colorCount;
  const numColorsRight = diverging ? Math.ceil(colorCount / 2) + (even ? 1 : 0) : 0;

  const genColors = (baseColors.length > 0)
    ? (baseColors.length > 1)
      ? baseColors
      : autoColors(baseColors[0]!, numColorsLeft, diverging)
    : [];

  const genColors2 = diverging
    ? (divergingColors.length > 1)
      ? divergingColors
      : autoColors(divergingColors[0]!, numColorsRight, diverging, true)
    : [];

  const stepsLeft = (baseColors.length > 0)
    ? (bezier ? chroma.bezier(genColors as string[]).scale() : chroma.scale(genColors))
      .correctLightness(correctLightness)
      .colors(numColorsLeft)
    : [];

  const stepsRight = diverging
    ? ((bezier && (divergingColors.length > 1)) ? chroma.bezier(genColors2 as string[]).scale() : chroma.scale(genColors2))
      .correctLightness(correctLightness)
      .colors(numColorsRight)
    : [];

  const steps = (even && diverging ? stepsLeft.slice(0, stepsLeft.length - 1) : stepsLeft).concat(stepsRight.slice(1));
  return steps;
}

function autoColors(color: string | chroma.Color, numColors: number, diverging: boolean, reverse: boolean = false): chroma.Color[] {
  if (diverging) {
    const colors = autoGradient(color, 3, diverging).concat(chroma('#f5f5f5'));

    if (reverse) {
      return colors.reverse();
    }

    return colors;
  }

  return autoGradient(color, numColors, diverging);
}

function autoGradient(color: string | chroma.Color, numColors: number, diverging: boolean): chroma.Color[] {
  const lab = chroma(color).lab();
  const lRange = 100 * ((0.95 - 1) / numColors);
  const lStep = lRange / (numColors - 1);
  const lStart = (100 - lRange) * 0.5;
  const range = createArray(numColors, (i) => lStart + (i * lStep));

  let offset = 0;

  if (!diverging) {
    offset = 9999;

    for (let i = 0; i < numColors; i++) {
      const diff = lab[0] - range[i]!;

      if (Math.abs(diff) < Math.abs(offset)) {
        offset = diff;
      }
    }
  }

  return range.map((l) => chroma.lab(l + offset, lab[1], lab[2]));
}
