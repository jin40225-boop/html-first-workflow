# Project Intake

Use this when entering an existing project or starting a new one.

## First Pass

Answer these before designing:

1. What is the user's real job-to-be-done?
2. Who uses it, how often, and under what pressure?
3. Is this a workflow tool, content site, dashboard, form system, creative piece, game, or admin system?
4. What already exists: files, framework, data, deployment, docs, tests, assets?
5. What must not break: production data, staff workflows, exports, auth, payments, external integrations?
6. What is the smallest useful end-to-end slice?
7. Is there a legacy system whose business rules are authoritative: Excel, VBA, Access, Google Sheets, paper forms, desktop software, or SOPs?

## Existing Project Scan

Prefer `rg --files` and targeted reads. Look for:

- Package/config files: `package.json`, `pyproject.toml`, `requirements.txt`, `vite.config.*`, `next.config.*`, `tsconfig.json`, `tailwind.config.*`, `pytest.ini`.
- App structure: `src/`, `app/`, `pages/`, `components/`, `routes/`, `api/`, `server/`, `templates/`, `static/`, `db/`, `migrations/`.
- Design system: CSS variables, theme files, shared components, layout shell, icons, spacing, typography.
- Tests: unit, integration, browser/e2e, screenshots.
- Docs: README, design docs, product specs, deployment notes.
- Legacy/business docs: entry instructions, frozen blueprint/spec, schema, module/function map, phase plans, completion reports, TBD list, migration SOP.
- Data contracts: schemas, migrations, API clients, seed data, spreadsheet templates.

## Legacy Office System Intake

Use this when replacing or extending Excel, VBA, Access, local desktop tools, or other office workflows.

- Build a source chain before implementation: entry instructions -> frozen spec/blueprint -> schema -> legacy module map -> phase/task docs -> TBD list.
- Identify which legacy behaviors are inherited, surpassed, or intentionally removed. Do not clone obsolete friction only because it exists.
- Preserve frozen vocabulary, role names, field labels, and staff-facing concepts unless the project explicitly changes them.
- Map legacy modules/macros/sheets to new services, routes, models, exports, tests, and docs.
- Find the privacy boundary: which source files, databases, logs, or row-level outputs must stay local, which metadata/forms/paths/logic maps AI may read, and which scripts may process private files without exposing their contents in chat.
- Separate operational artifacts from source code: user manuals, deployment SOPs, troubleshooting guides, handoff reports, and final delivery checklists are part of the product.

## Runtime Identity Check

Before trusting what a local app shows, identify what is actually running:

- Map the launch path: desktop shortcut, script, package command, server entrypoint, static UI path, and browser URL.
- Compare the visible UI with server status endpoints or logs when available. A modern-looking page can still be backed by an old server.
- List legacy entrypoints and compatibility files separately from the current path.
- Check model names, provider SDK versions, environment variables, and startup scripts when AI agents are part of the workflow.
- Treat session caches as derived unless the project explicitly says they are canonical.
- If the user says "this used to work" or "nothing opens", verify the packaged/startup path before editing UI code.

## Output Of Intake

For non-trivial tasks, form a short mental map:

- Product: what the system is for.
- Architecture: frontend, backend, data, integrations, deployment.
- Workflows: primary user paths and edge cases.
- Component model: reusable pieces and where state lives.
- Risks: data loss, scope, permission, browser layout, regression.
- Verification: commands and browser paths to prove the change.

Do not spend long on discovery when the requested change is narrow. Read enough to avoid wrong assumptions, then move.

## New Project Defaults

When the user asks for a new app/tool/site and leaves choices open:

- Build the real usable first screen, not a marketing page.
- Pick the simplest stack consistent with the workspace and requested outcome.
- Create stable dimensions for boards, grids, toolbars, cards, counters, and fixed-format UI.
- Include meaningful sample data when it helps users understand workflow.
- Provide data shapes and state boundaries early; UI without state usually collapses later.
