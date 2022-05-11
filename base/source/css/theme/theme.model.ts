export type ThemeEntry<Name extends string = string> = string | {
  name?: Name,
  color: string
};

export type Theme<T extends Record<string, ThemeEntry> = Record<string, ThemeEntry>> = {
  isDark?: boolean,
  colors: T
};

export function createTheme<T extends Theme>(theme: T): T {
  return theme;
}
