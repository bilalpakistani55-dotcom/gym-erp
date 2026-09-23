import { radius, shadow, spacing, themes, typography, type SemanticColor, type ThemeMode } from "./tokens";

export type ComponentSize = "sm" | "md" | "lg";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type BadgeTone = SemanticColor;
export type AlertTone = Exclude<SemanticColor, "neutral" | "accent">;

export type StyleRecipe = Readonly<Record<string, string | number>>;

export const controlHeights = {
  sm: 32,
  md: 40,
  lg: 48,
} as const satisfies Record<ComponentSize, number>;

export const iconSizes = {
  sm: 16,
  md: 18,
  lg: 20,
} as const satisfies Record<ComponentSize, number>;

export const touchTarget = {
  minimum: 44,
  comfortable: 48,
} as const;

const buttonSizeStyles = {
  sm: { minHeight: controlHeights.sm, paddingInline: spacing[3], fontSize: typography.size.sm },
  md: { minHeight: controlHeights.md, paddingInline: spacing[4], fontSize: typography.size.md },
  lg: { minHeight: controlHeights.lg, paddingInline: spacing[5], fontSize: typography.size.md },
} as const satisfies Record<ComponentSize, StyleRecipe>;

export function getButtonRecipe(
  mode: ThemeMode,
  variant: ButtonVariant = "primary",
  size: ComponentSize = "md",
): StyleRecipe {
  const theme = themes[mode];
  const base = {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    display: "inline-flex",
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.weight.semibold,
    gap: spacing[2],
    justifyContent: "center",
    lineHeight: typography.lineHeight.tight,
    transitionDuration: "140ms",
    transitionProperty: "background-color, border-color, color, box-shadow",
    ...buttonSizeStyles[size],
  } as const;

  const variants = {
    primary: {
      backgroundColor: theme.brand.background,
      borderColor: theme.brand.background,
      color: theme.brand.text,
    },
    secondary: {
      backgroundColor: theme.surface,
      borderColor: theme.borderStrong,
      color: theme.text,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: theme.textMuted,
    },
    danger: {
      backgroundColor: theme.danger.background,
      borderColor: theme.danger.background,
      color: theme.danger.text,
    },
  } as const satisfies Record<ButtonVariant, StyleRecipe>;

  return { ...base, ...variants[variant] };
}

export function getInputRecipe(mode: ThemeMode, size: ComponentSize = "md"): StyleRecipe {
  const theme = themes[mode];

  return {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: theme.text,
    fontFamily: typography.fontFamily.sans,
    fontSize: size === "sm" ? typography.size.sm : typography.size.md,
    minHeight: controlHeights[size],
    paddingInline: spacing[3],
    placeholderColor: theme.textSubtle,
  };
}

export function getCardRecipe(mode: ThemeMode, elevated = false): StyleRecipe {
  const theme = themes[mode];

  return {
    backgroundColor: elevated ? theme.surfaceRaised : theme.surface,
    borderColor: theme.border,
    borderRadius: radius.md,
    borderWidth: 1,
    boxShadow: elevated ? shadow.sm : shadow.none,
    padding: spacing[4],
  };
}

export function getBadgeRecipe(mode: ThemeMode, tone: BadgeTone = "neutral"): StyleRecipe {
  const theme = themes[mode];

  if (tone === "neutral") {
    const colors = theme.neutral;

    return {
      alignItems: "center",
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      color: colors.text,
      display: "inline-flex",
      fontSize: typography.size.xs,
      fontWeight: typography.weight.semibold,
      minHeight: 24,
      paddingInline: spacing[2],
    };
  }

  const colors = theme[tone];

  return {
    alignItems: "center",
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    color: colors.strongText,
    display: "inline-flex",
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    minHeight: 24,
    paddingInline: spacing[2],
  };
}

export function getAlertRecipe(mode: ThemeMode, tone: AlertTone = "info"): StyleRecipe {
  const theme = themes[mode];
  const colors = theme[tone];

  return {
    backgroundColor: colors.subtle,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.strongText,
    paddingBlock: spacing[3],
    paddingInline: spacing[4],
  };
}

export const tableRecipe = {
  rowHeight: 48,
  compactRowHeight: 40,
  headerHeight: 44,
  cellPaddingInline: spacing[4],
  borderRadius: radius.md,
} as const;

export const modalRecipe = {
  width: {
    sm: 420,
    md: 640,
    lg: 860,
  },
  borderRadius: radius.lg,
  padding: spacing[6],
  overlayZIndex: 300,
  contentZIndex: 400,
} as const;

export const toastRecipe = {
  width: 360,
  borderRadius: radius.md,
  padding: spacing[4],
  timeoutMs: 5000,
} as const;

export const skeletonRecipe = {
  borderRadius: radius.sm,
  minHeight: 16,
  opacity: 0.72,
} as const;
