export type ThemeEntry = string | {
  name?: string,
  color: string
};

export type Theme = {
  isDark?: boolean,
  colors: Record<string, ThemeEntry>
};
