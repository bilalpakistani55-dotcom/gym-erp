# Implementation plan

## Objective

Create the operating architecture of GYM ERP in a way that supports an offline-first, local-PC-centric gym management workflow with optional cloud expansion later.

## Completed in Phase 1

- Confirmed monorepo structure and workspace boundaries
- Added app workspace shells for desktop, mobile, and optional web expansion
- Established shared domain model for gyms, members, payments, expenses, attendance, and sync
- Added sync record definitions that support create/update/delete retries and conflict awareness
- Connected setup flow to default payroll, payment, and expense configuration
- Defined the architecture contract for desktop, mobile, shared packages, and services

## Completed in Phase 2

- Expanded `packages/ui` from a placeholder into a typed design-system package
- Added light and dark semantic themes
- Added reusable tokens for typography, spacing, radius, shadows, motion, breakpoints, z-index, and charts
- Added component recipes for controls, cards, badges, alerts, tables, modals, toasts, and loading skeletons
- Added desktop and mobile navigation metadata with icon and permission hints
- Added sync, membership, and payment status visuals with non-technical employee messages
- Added CSS variable generation for the future desktop and optional-web shells
- Added unit coverage for theme parity, navigation, recipes, sync messaging, and CSS variables

## Planned phases

1. Project architecture
2. Design system
3. Database
4. Desktop shell
5. Authentication and RBAC
6. Member management
7. Memberships
8. Payments
9. Expenses and revenue
10. Attendance
11. Photo and file management
12. Mobile app
13. Offline engine
14. Synchronization engine
15. Backup and recovery
16. Face recognition abstraction
17. Fingerprint hardware abstraction
18. Reports
19. Diagnostics
20. Production installer
21. Android release APK/AAB
22. Testing
23. Security audit
24. Final production polish

## Package responsibilities

### apps/desktop

- Tauri or Electron shell
- Windows installer packaging
- Local desktop onboarding and shell layout
- File system access for local data and backups

### apps/mobile

- React Native app
- Local SQLite storage
- Camera, photo capture, and field-entry flows
- Offline status and sync indicators

### apps/optional-web

- Future remote admin dashboard
- Optional cloud backend views
- Multi-branch expansion path

### packages/shared-types

- Shared contracts, enums, statuses, and constants
- Cross-platform product metadata

### packages/database

- SQLite initialization
- Migration management
- Database access abstraction

### packages/business-logic

- Member creation, renewals, payments, expense validation
- Setup, audit logs, and transaction orchestration

### packages/security

- Password hashing, secure storage helpers, and session logic

### packages/sync-engine

- Sync queue management
- Conflict detection and resolution
- Retry orchestration

### packages/hardware

- Device adapters for camera, fingerprint, and face recognition
- Vendor-specific implementation boundaries

### packages/ui

- Design tokens and reusable UI building blocks

### services/*

- Backup automation
- Local sync service
- Optional cloud integration bridge

## Engineering guardrails

- Keep the local SQLite database as the default system of record
- Do not make cloud services mandatory for any core workflow
- Keep UI simple, role-aware, and deterministic
- Use transactions for all financial and member-write operations
- Keep data in the local file system instead of database BLOBs for photos and documents
- Ensure new code is introduced in the right layer and not scattered into UI components

## Completion criteria for Phase 1

The Phase 1 setup is complete when the repository clearly supports:

- A clean monorepo structure
- Real `apps/*`, `packages/*`, and `services/*` workspace packages
- Shared domain contracts
- Local sync and first-run foundations
- Clear phase-by-phase delivery roadmap
- Explicit separation between desktop, mobile, packages, and service layers

This foundation supports the next implementation waves without compromising the offline-first product direction.
