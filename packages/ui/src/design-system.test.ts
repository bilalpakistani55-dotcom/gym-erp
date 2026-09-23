import { describe, expect, it } from "vitest";

import {
  createCssVariableBlock,
  desktopNavigation,
  formatPendingSyncMessage,
  getBadgeRecipe,
  getButtonRecipe,
  mobileNavigation,
  themes,
} from ".";

describe("design system foundations", () => {
  it("defines light and dark themes with the same semantic color groups", () => {
    expect(Object.keys(themes.light)).toEqual(Object.keys(themes.dark));
    expect(themes.light.brand.background).not.toEqual(themes.dark.brand.background);
  });

  it("provides desktop and mobile navigation required by the product spec", () => {
    expect(desktopNavigation.map((item) => item.id)).toEqual([
      "dashboard",
      "members",
      "attendance",
      "memberships",
      "payments",
      "expenses",
      "income",
      "equipment",
      "staff",
      "reports",
      "notifications",
      "devices",
      "backups",
      "settings",
    ]);

    expect(mobileNavigation.map((item) => item.id)).toEqual([
      "dashboard",
      "members",
      "attendance",
      "payments",
      "renewals",
      "expenses",
      "sync",
      "settings",
    ]);
  });

  it("creates stable component recipes without runtime UI dependencies", () => {
    expect(getButtonRecipe("light", "primary", "md")).toMatchObject({
      minHeight: 40,
      borderRadius: 8,
      fontWeight: 600,
    });

    expect(getBadgeRecipe("dark", "warning")).toMatchObject({
      borderRadius: 999,
      fontSize: 12,
    });
  });

  it("formats sync waiting text for employee-facing screens", () => {
    expect(formatPendingSyncMessage(0)).toBe("All changes are saved on this device and synchronized.");
    expect(formatPendingSyncMessage(1)).toBe("1 change waiting to synchronize");
    expect(formatPendingSyncMessage(7)).toBe("7 changes waiting to synchronize");
  });

  it("exports CSS variables for desktop/web shells", () => {
    expect(createCssVariableBlock(":root", "light")).toContain("--gym-color-background");
    expect(createCssVariableBlock("[data-theme='dark']", "dark")).toContain("--gym-font-sans");
  });
});
