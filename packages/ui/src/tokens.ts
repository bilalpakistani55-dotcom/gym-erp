export type ThemeMode = "light" | "dark";

export type SemanticColor =
  | "neutral"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

export const palette = {
  slate: {
    25: "#fcfcfd",
    50: "#f8fafc",
    100: "#eef2f6",
    200: "#d8dee8",
    300: "#b8c2d2",
    400: "#8793a5",
    500: "#647084",
    600: "#465264",
    700: "#303a49",
    800: "#202936",
    900: "#121821",
    950: "#090d13",
  },
  pine: {
    50: "#eef8f3",
    100: "#d8f0e5",
    200: "#b7e2ce",
    300: "#86cdae",
    400: "#4dae88",
    500: "#2d926e",
    600: "#207558",
    700: "#1b5e49",
    800: "#184a3b",
    900: "#143d32",
  },
  amber: {
    50: "#fff8e6",
    100: "#ffedba",
    200: "#ffdc7a",
    300: "#ffc83d",
    400: "#f4ad16",
    500: "#d99008",
    600: "#b86f04",
    700: "#925307",
    800: "#743f0c",
    900: "#5f340f",
  },
  red: {
    50: "#fff1f0",
    100: "#ffe0dd",
    200: "#ffc5bf",
    300: "#ff9c92",
    400: "#f8695d",
    500: "#e53d32",
    600: "#c72d24",
    700: "#a5251e",
    800: "#881f1a",
    900: "#711f1b",
  },
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
} as const;

export const typography = {
  fontFamily: {
    sans: '"Inter", "Segoe UI", "Noto Sans", system-ui, sans-serif',
    mono: '"Cascadia Mono", "SFMono-Regular", Consolas, monospace',
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.65,
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const shadow = {
  none: "none",
  xs: "0 1px 2px rgba(15, 23, 42, 0.08)",
  sm: "0 1px 3px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 12px 28px rgba(15, 23, 42, 0.12)",
  focus: "0 0 0 3px rgba(45, 146, 110, 0.24)",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;

export const breakpoints = {
  mobile: 360,
  phablet: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export const themes = {
  light: {
    mode: "light",
    colorScheme: "light",
    background: "#f7f8fa",
    surface: "#ffffff",
    surfaceRaised: "#ffffff",
    surfaceMuted: "#f1f4f8",
    text: "#121821",
    textMuted: "#465264",
    textSubtle: "#647084",
    border: "#d8dee8",
    borderStrong: "#b8c2d2",
    overlay: "rgba(9, 13, 19, 0.48)",
    inverse: "#ffffff",
    focus: palette.pine[500],
    neutral: {
      background: palette.slate[100],
      border: palette.slate[200],
      text: palette.slate[800],
    },
    brand: {
      background: palette.pine[600],
      subtle: palette.pine[50],
      border: palette.pine[200],
      text: "#ffffff",
      strongText: palette.pine[800],
    },
    accent: {
      background: palette.amber[500],
      subtle: palette.amber[50],
      border: palette.amber[200],
      text: palette.slate[950],
      strongText: palette.amber[800],
    },
    success: {
      background: palette.pine[600],
      subtle: palette.pine[50],
      border: palette.pine[200],
      text: "#ffffff",
      strongText: palette.pine[800],
    },
    warning: {
      background: palette.amber[500],
      subtle: palette.amber[50],
      border: palette.amber[200],
      text: palette.slate[950],
      strongText: palette.amber[800],
    },
    danger: {
      background: palette.red[600],
      subtle: palette.red[50],
      border: palette.red[200],
      text: "#ffffff",
      strongText: palette.red[800],
    },
    info: {
      background: palette.blue[600],
      subtle: palette.blue[50],
      border: palette.blue[200],
      text: "#ffffff",
      strongText: palette.blue[800],
    },
  },
  dark: {
    mode: "dark",
    colorScheme: "dark",
    background: "#090d13",
    surface: "#121821",
    surfaceRaised: "#18212d",
    surfaceMuted: "#202936",
    text: "#fcfcfd",
    textMuted: "#d8dee8",
    textSubtle: "#b8c2d2",
    border: "#303a49",
    borderStrong: "#465264",
    overlay: "rgba(0, 0, 0, 0.62)",
    inverse: "#090d13",
    focus: palette.pine[300],
    neutral: {
      background: palette.slate[800],
      border: palette.slate[700],
      text: palette.slate[100],
    },
    brand: {
      background: palette.pine[300],
      subtle: "rgba(134, 205, 174, 0.14)",
      border: palette.pine[700],
      text: palette.slate[950],
      strongText: palette.pine[100],
    },
    accent: {
      background: palette.amber[300],
      subtle: "rgba(255, 200, 61, 0.14)",
      border: palette.amber[700],
      text: palette.slate[950],
      strongText: palette.amber[100],
    },
    success: {
      background: palette.pine[300],
      subtle: "rgba(134, 205, 174, 0.14)",
      border: palette.pine[700],
      text: palette.slate[950],
      strongText: palette.pine[100],
    },
    warning: {
      background: palette.amber[300],
      subtle: "rgba(255, 200, 61, 0.14)",
      border: palette.amber[700],
      text: palette.slate[950],
      strongText: palette.amber[100],
    },
    danger: {
      background: palette.red[300],
      subtle: "rgba(255, 156, 146, 0.14)",
      border: palette.red[700],
      text: palette.slate[950],
      strongText: palette.red[100],
    },
    info: {
      background: palette.blue[300],
      subtle: "rgba(147, 197, 253, 0.14)",
      border: palette.blue[700],
      text: palette.slate[950],
      strongText: palette.blue[100],
    },
  },
} as const;

export const chartPalette = {
  revenue: palette.pine[500],
  expenses: palette.red[500],
  attendance: palette.blue[500],
  renewals: palette.amber[500],
  netIncome: palette.pine[700],
  muted: palette.slate[300],
} as const;

export const motion = {
  duration: {
    instant: 80,
    fast: 140,
    normal: 220,
    slow: 320,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1.15)",
  },
} as const;

export const tokens = {
  palette,
  typography,
  spacing,
  radius,
  shadow,
  zIndex,
  breakpoints,
  themes,
  chartPalette,
  motion,
} as const;

export type Theme = (typeof themes)[ThemeMode];
