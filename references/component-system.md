# Component System

Use this when designing or refactoring UI components and reusable patterns.

## Component Anatomy

A useful component has:

- Purpose: what user job it serves.
- Inputs: data and configuration.
- Outputs: callbacks, events, mutations, navigation.
- States: loading, empty, selected, disabled, error, dirty, saved.
- Boundaries: what it owns and what the parent owns.
- Accessibility: labels, focus order, keyboard behavior.
- Layout contract: min/max width, height behavior, wrapping, overflow.

## Common Component Families

- App shell: navigation, identity, primary actions.
- Workbench: filters, tabs, table/grid, side panel, batch tools, export menu.
- Process-mode editor: one record, grouped fields, mode selector, state banner, completeness indicator, history preview, and mode-specific actions.
- Form modal: grouped fields, validation, save/cancel, keyboard focus.
- Detail panel: read summary, edit affordances, history/notes.
- Data table: sort/filter/search, sticky headers, row actions, empty state.
- Status badge: semantic color, short label, tooltip/details.
- Confirmation queue: pending/confirmed lifecycle, sender/recipient, elapsed time, action button, and audit link.
- Masked relationship warning: enough information to prompt safe action without leaking protected details.
- Timeline/flow editor: ordered rows, time fields, responsible person, drag/sort only if needed.
- Resource picker: searchable existing resources plus create-new path.
- Export/download menu: grouped outputs with readiness hints.

## Design Rules

- Prefer composition over mega-components.
- Keep shared primitives boring and reliable.
- Name components after user concepts, not visual shape, when they encode workflow.
- Keep layout components separate from domain logic when possible.
- Avoid turning every one-off UI into a reusable component too early.
- When reusing a component, check whether its states and accessibility still fit the new context.

## Component Change Checklist

1. Search existing components before creating a new one.
2. Confirm data shape and ownership.
3. Add missing states deliberately.
4. Check responsive behavior.
5. Verify keyboard/focus behavior for modals, menus, tabs, and dialogs.
6. Run component or browser tests if available.
