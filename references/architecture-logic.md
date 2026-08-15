# Architecture And Logic

Use this for backend, data model, API, state, permissions, imports/exports, and feature logic.

## Feature Chain

Design each feature as a chain:

```text
user intent -> UI control -> client state -> validation -> API/action -> storage -> derived state -> output/export/notification -> verification
```

If any link is missing, the feature is not done.

## Architecture Questions

- What is the source of truth?
- What is derived or cached?
- Which old stores, archived files, compatibility routes, or stale generated outputs can still contaminate the current workflow?
- Where are permissions enforced?
- Where is validation duplicated between frontend and backend?
- What downstream screens, exports, reports, or automations depend on this data?
- What happens when a record is deleted, cancelled, archived, or restored?
- What must happen atomically in one transaction?

## Data And API Rules

- Prefer structured data models over ad hoc string conventions.
- Keep IDs stable; do not rely on display names as foreign keys unless the project already does.
- Add migrations/backfills when schema changes affect existing data.
- Keep read models shaped for UI, but keep writes scoped to domain tables/actions.
- Treat bulk imports as high-risk: preserve curated user edits unless explicitly replacing them.
- Make exports/reporting read the same canonical data the UI edits.

## Legacy Office Modernization

Use this when modernizing Excel, VBA, Access, Google Sheets, or local office tools into software.

- Treat the legacy system as evidence of proven work practice, not as UI or code style that must be copied line-for-line.
- Create a traceable chain from old behavior to new implementation: workbook/sheet/module -> domain rule -> service/API -> UI state -> export/report -> test.
- Separate decisions into inherited, improved, and removed behavior. Document removed behavior so future agents do not accidentally rebuild it.
- Keep frozen role names, field labels, and business vocabulary aligned across code, UI, docs, exports, and tests.
- Preserve user-trusted outputs such as Excel reports or handoff workbooks when they are part of the operating model, even if the canonical store moves to a database.
- When old logic is ambiguous, check the frozen spec, legacy map, and TBD list before inventing a new rule.

## Audit-First Workflow State

Use this when an internal team values trust, traceability, and fast work more than heavy approval gates.

- Distinguish current operational state from permanent audit state. Current flags can support fast sorting, but important actions need immutable history.
- Record actor, timestamp, event type, old value, new value, source, and related workflow object for meaningful events.
- If the real workflow is "free change + audit trail", do not impose a rigid state machine unless the domain requires it.
- Model confirmation semantics precisely. `pending -> confirmed` may mean "received" rather than "approved", "accepted", or "reviewed".
- For assignment and reassignment, update the active owner immediately when the business expects no gap, then create confirmation and audit records around that fact.
- Keep audit records visible in reports and exports so the trace is not only a backend detail.

## Bulk Workflow Guardrails

Use this for batch assignment, imports, mass edits, report generation, and other multi-record actions.

- Treat preview and execute as separate risk points. Revalidate duplicates, permissions, and current record state immediately before writing.
- Use the canonical log or domain table as a duplicate guard when the business action itself is the source of truth.
- Return skipped rows with explicit reasons; do not silently drop records.
- Make batch actions transactional when partial success would confuse users, or explicitly report partial success when the domain allows it.
- After batch writes, verify downstream counters, confirmations, audit history, exports, and dashboards read the same facts.

## Source-Of-Truth And Archive Discipline

Use this for data-governance tools, graph pipelines, imports, migrations, and AI-assisted extraction systems.

- Name the canonical store in code and UI when possible. Operators should not have to infer whether they are looking at legacy or current data.
- Separate raw inputs, registries/indexes, graph/domain stores, session caches, and narrative/reporting views.
- Archive old data by moving it out of active read paths, not only by renaming it in place.
- Add an explicit reset/archive flow when old logic produced incompatible data. Preserve traceability without letting stale records participate in new runs.
- Make writes narrow and auditable: raw source registration, node/entity registration, edge/relationship commits, and report generation should be distinct steps.
- Add a governance gate before expensive or polluting downstream work when upstream validation rejects records.
- Hydrate UI/session state from the canonical store after restart so the interface does not imply that valid persisted data disappeared.
- Surface mechanism identity in operational UIs: active server, canonical database path, legacy write status, graph/version mode, and model/provider names.

## Shared-Folder Personal App Delivery

Use this for internal tools distributed through OneDrive, SMB shares, portable `.exe` bundles, local launchers, or per-person app folders.

- Separate runtime from data. Prefer local cached execution for packaged apps while keeping canonical data in the shared folder.
- Make the launch path explicit: batch file -> PowerShell or launcher -> cached executable/server -> health endpoint -> browser URL.
- Store per-person identity in a small profile config, and store shared-data location separately. This lets each folder open as the right role without needing separate databases.
- For packaged one-file apps, verify identity lookup in the packaged runtime, not only in development. Check bundled profile, executable-adjacent profile, and development fallback paths deliberately.
- Keep permission checks server-side. A personal launcher or hidden UI is only convenience; APIs, exports, batch actions, and dashboards still need scoped reads and writes.
- Treat placeholder staff or future users as first-class roster entries when the user needs operational readiness. Avoid leaving old placeholder names active in dropdowns.
- Make batch deployment script-driven: create/update users, sync profile files, generate role-scoped Excel, copy launchers/runtime, update source snapshots, and write a deploy summary. Default build scripts to dry-run, and require an explicit execution flag for mass output.
- Keep temporary build/work directories outside cloud-synced project folders when tools are prone to lock files.
- Back up the canonical database before profile, roster, import, or deployment scripts mutate real data.

## Excel As Operational Boundary

Use this when Excel remains part of the business process even though the app has a database.

- Decide whether Excel is an input form, output report, audit snapshot, or staff handoff surface. Do not mix roles silently.
- Generate workbooks from canonical data after permissions and field mapping are applied.
- Include stable IDs and human-readable codes so rows can be reconciled with the app.
- Include a field guide sheet when nontechnical staff may inspect or reuse the workbook.
- Keep dropdown values aligned with the same dictionaries used by the UI.
- For personal workbooks, prefill only in-scope records and provide blank rows that preserve validations.
- Verify workbook row counts against API/database scope counts.

## Google Apps Script + Sheets Boards

Use this when a project is a GAS Web App with Google Sheet as the datastore.

- Identify routes first: `doGet(e)` should reveal views such as input, host/admin, and public/projection.
- Treat the spreadsheet schema as the database contract. Read `Schema.js`, sheet names, header arrays, and validation helpers before editing UI.
- Separate canonical records from derived or scenario records. For comparison tools, original rows should stay intact while trial changes live in a scenario/history table.
- Check write behavior for `0`, booleans, dates, and empty strings. Avoid truthy/falsy checks when `0` is a valid user value.
- Check whether updates replace only the intended record/key or accidentally deactivate/overwrite sibling adjustments.
- Verify public sync behavior: polling interval, modal/detail refresh, current selection preservation, and what happens when a record disappears.
- Confirm access and deployment settings: `appsscript.json`, `.clasp.json`, Web App access mode, and any gate page must match the actual route behavior.
- Run encoding checks before deploy when the project contains Traditional Chinese UI text. HTML entities may render correctly but reduce maintainability.

## State Design

For frontend state:

- Separate server data, draft form state, UI visibility state, and derived display state.
- Make save/cancel behavior clear.
- Re-fetch or patch local state deliberately after mutation.
- Avoid hidden side effects when a field changes another field; if auto-fill exists, make it predictable.

For backend state:

- Prefer transaction boundaries that match user intent.
- Audit important creates, updates, imports, and batch operations when the project has audit patterns.
- Keep role checks server-side even if UI hides controls.

## Refactoring Rules

- Refactor only where it lowers risk for the requested change.
- Preserve local style and naming.
- Avoid broad rewrites of working UI and data flows.
- Create abstractions after seeing real repetition, not before.
- When extracting components or services, keep public behavior and tests stable.
