import colors from "tailwindcss/colors";

export const themeColorsByName = {
  amber: colors.amber,
  blue: colors.blue,
  cyan: colors.cyan,
  gray: colors.neutral,
  green: colors.green,
  pink: colors.pink,
  red: colors.red,
  rose: colors.rose,
  teal: colors.teal,
  violet: colors.violet,
} as const;

export type ThemeColorName = keyof typeof themeColorsByName;

export const DEFAULT_THEME_COLOR: ThemeColorName = "cyan";

export function resolveThemeColorPalette(requestedTheme: unknown) {
  const themeName: ThemeColorName =
    typeof requestedTheme === "string" &&
    Object.prototype.hasOwnProperty.call(themeColorsByName, requestedTheme)
      ? (requestedTheme as ThemeColorName)
      : DEFAULT_THEME_COLOR;

  return themeColorsByName[themeName];
}
