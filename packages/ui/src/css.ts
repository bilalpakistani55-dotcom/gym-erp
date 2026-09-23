import { radius, shadow, spacing, themes, typography, type ThemeMode } from "./tokens";

type CssValue = string | number;

function cssVariableName(parts: string[]): string {
  return `--gym-${parts.join("-")}`;
}

function flattenTokens(value: unknown, path: string[] = []): Record<string, CssValue> {
  if (typeof value === "string" || typeof value === "number") {
    return { [cssVariableName(path)]: value };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, CssValue>>((accumulator, [key, child]) => {
    return { ...accumulator, ...flattenTokens(child, [...path, key]) };
  }, {});
}

export function createThemeCssVariables(mode: ThemeMode): Record<string, CssValue> {
  const theme = themes[mode];

  return {
    ...flattenTokens(theme, ["color"]),
    "--gym-font-sans": typography.fontFamily.sans,
    "--gym-font-mono": typography.fontFamily.mono,
    "--gym-radius-sm": `${radius.sm}px`,
    "--gym-radius-md": `${radius.md}px`,
    "--gym-radius-lg": `${radius.lg}px`,
    "--gym-shadow-sm": shadow.sm,
    "--gym-shadow-md": shadow.md,
    "--gym-space-2": `${spacing[2]}px`,
    "--gym-space-3": `${spacing[3]}px`,
    "--gym-space-4": `${spacing[4]}px`,
    "--gym-space-6": `${spacing[6]}px`,
  };
}

export function createCssVariableBlock(selector: string, mode: ThemeMode): string {
  const declarations = Object.entries(createThemeCssVariables(mode))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");

  return `${selector} {\n${declarations}\n}`;
}
