# GYM ERP

GYM ERP is an offline-first gym management system built for a local desktop hub and Android mobile clients. The architecture prioritizes local reliability, automatic synchronization, and optional cloud expansion without forcing cloud dependency for daily gym operations.

## Core principles

- Offline-first local operation
- Local PC is the primary data hub
- Android app supports mobile workflows and sync
- SQLite is the default local database
- Synchronization is automatic, resumable, and conflict-aware
- Cloud services remain optional and non-blocking
- Non-technical setup is required for gym staff and owners

## Monorepo layout

- apps/desktop: desktop client shell and Windows installation preparation
- apps/mobile: Android client for local member, attendance, and payment workflows
- apps/optional-web: future web dashboard and remote administration layer
- packages/shared-types: shared domain contracts and constants
- packages/database: SQLite migrations, path helpers, and database access
- packages/business-logic: domain services and first-run setup
- packages/validation: validation schemas and safe parsing
- packages/security: password and session security helpers
- packages/sync-engine: sync queue, conflict tracking, and local/offline orchestration
- packages/hardware: biometric and device abstractions
- packages/ui: design tokens and cross-platform UX primitives
- services/sync: local sync service
- services/backup: automated backup and restore logic
- services/optional-cloud: future cloud integration layer

## Phase 1 deliverable

This repository currently establishes the foundation for the full ERP system:

1. Project architecture contract
2. Mono-repo structure and package boundaries
3. Desktop, mobile, and optional web workspace shells
4. Shared domain model and platform constants
5. Local sync and first-run setup flow
6. Implementation roadmap for the remaining phases

## Development guidance

- Use SQLite locally; avoid Docker for the default installation path.
- Keep the desktop app authoritative for everyday in-gym operations.
- Keep cloud features opt-in and non-blocking.
- Keep UI workflows simple enough for a non-technical gym owner.

## Phase 2 deliverable

Phase 2 adds the shared design-system foundation in `packages/ui`:

- Typed light and dark themes
- Typography, spacing, radius, shadow, motion, breakpoint, and chart tokens
- Desktop and mobile navigation metadata with icon and permission hints
- Cross-platform component recipes for buttons, inputs, cards, badges, alerts, tables, modals, toasts, and skeletons
- Employee-safe sync, membership, and payment status visuals
- CSS variable generation for future desktop/web shells

## Next phase

The next workstream is Phase 3: implement the SQLite database schema and migration flow.
