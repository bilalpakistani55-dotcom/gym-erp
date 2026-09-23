# Design system

Phase 2 centralizes GYM ERP's visual and interaction foundations in `packages/ui`.

## Goals

- Keep desktop, mobile, and optional-web experiences visually consistent
- Avoid a web-only dependency before the React/Tauri and React Native implementation phases
- Provide typed tokens and recipes that can be bound to platform components later
- Keep status messages clear for gym employees and avoid technical sync language

## Package contents

- `tokens.ts`: palettes, typography, spacing, radius, shadows, breakpoints, z-index, motion, chart colors, and light/dark themes
- `components.ts`: dependency-free recipes for buttons, inputs, cards, badges, alerts, tables, modals, toasts, and skeletons
- `navigation.ts`: desktop and mobile navigation metadata, including icon names and permission hints
- `status.ts`: sync, membership, and payment status visuals with employee-facing copy
- `css.ts`: CSS variable helpers for desktop and web shells

## Usage pattern

Application shells should import recipes and bind them to their native UI layer:

```ts
import { getButtonRecipe, themes } from "@gym-erp/ui";

const primaryButton = getButtonRecipe("light", "primary", "md");
const background = themes.light.background;
```

React Native screens can map recipe keys to `StyleSheet` objects. Desktop/web shells can use `createCssVariableBlock` to emit theme variables and then consume them in CSS.

## Visual principles

- Use a quiet, operational ERP interface rather than a marketing layout
- Prefer clear icon-supported controls and predictable density
- Keep cards for actual repeated records, dialogs, and framed tools
- Preserve accessible contrast in light and dark modes
- Make sync and error states reassuring: data saved locally, retries automatic
