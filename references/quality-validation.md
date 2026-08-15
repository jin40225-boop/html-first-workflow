# Quality And Validation

> **規則權威位置（2026-08-15 收斂，避免兩份文件漂移）**
> 本檔沿用自舊技能 `software-web-design-workflow`，只講**一般軟體變更**該做多少測試與驗證。
> 下列主題**不以本檔為準**：
> - 單檔 HTML 產出物的交付檢查、瀏覽器實測、降級行為 →〔`delivery-resilience.md`〕
> - 機器驗證與 `validate: PASS` 交付規則 →〔`delivery-resilience.md` 第四節〕
> - 預覽版本對齊（四行版本區塊）→〔使用者全域 `CLAUDE.md`〕
>
> 本檔與它們衝突時，以它們為準。

Use this to decide how much testing and verification a change needs.

## Risk Scale

Low risk:

- Copy-only changes.
- Local styling fix.
- Single static component with no data mutation.

Medium risk:

- UI form changes.
- New component states.
- API payload shape changes.
- Derived counts, filters, or warnings.

High risk:

- Schema/migration changes.
- Auth, permissions, payments, exports, imports, production data.
- Cross-module refactors.
- Deployment/build pipeline changes.

## Validation Ladder

Pick the lowest set that gives real confidence:

1. Static checks: lint, typecheck, syntax compile.
2. Unit tests for pure logic.
3. Integration tests for API/storage/workflow.
4. Browser smoke test for UI and interaction.
5. Visual screenshot check for layout-sensitive work.
6. End-to-end flow for user-critical paths.
7. Deployment/startup check for packaged or production-like output.

## Browser Checks

For web UI, verify:

- First screen renders with real content.
- Main action works.
- Empty and error states are acceptable.
- Text and controls do not overlap.
- Mobile/narrow width still works.
- Loading/saving state does not create confusing duplicate actions.

## Data Checks

For data changes, verify:

- Create, edit, and read paths agree.
- Permissions are enforced server-side.
- Exports/reports use the updated data.
- Cancel/archive/delete behavior is intentional.
- Existing data is migrated or safely defaulted.

## Sensitive Local Data And Migration Checks

Use this when real source files, logs, databases, or personally identifiable data must stay on the user's machine.

- Classify inputs and commands before running them: safe code/test checks, AI-readable intake forms with paths and legacy logic, script-mediated local processing, and private outputs that must not be pasted into chat.
- Prefer local scripts for real consolidation work. The script may read private files on the user's machine, but chat should only receive sanitized summaries, counts, status, or error categories.
- Do not ask the user to paste private rows, logs, database contents, names, IDs, addresses, phone numbers, or source workbooks into chat.
- Keep dry-run and execute logs local. Ask for aggregate counts, pass/fail status, or sanitized error categories only.
- Test migration logic with synthetic fixtures or non-sensitive development databases before any real run.
- Back up the target database and related WAL/SHM files before real writes.
- After migration, reconcile aggregate counts across source categories, canonical tables, history tables, assignment/log tables, and exports without exposing row-level private content.

## Phase Handoff Reports

Use this for long-running projects split across phases or agents.

- Record completed behavior, deferred items with reasons, technical decisions, source/legacy mappings, verification commands, and next prerequisites.
- Include commands that could not be run and why, not only successful checks.
- Keep README, deployment SOP, final checklist, troubleshooting docs, and handoff report aligned with the same current facts.
- Treat the handoff report as a startup path for the next agent: what is safe to run, what must not be touched, and what still requires human confirmation.

## Preview Version Alignment

Use this whenever delivering a preview URL, dev server, or packaged build to the user. The goal: the user never has to ask "is this the right version?" Treat repeated "wrong version" complaints as a process bug to fix once, not a per-request lookup.

### Single Trusted Preview Entry

A project should have exactly one preview entry that the user (and you) run. Examples:

- `npm run preview:local`
- `python scripts/preview_verified.py`
- `./start.ps1` / `pwsh ./scripts/Start-Dev.ps1`

The entry must do these things, in this order:

1. Print absolute working directory, git branch, short commit hash, dirty/clean state, and the target port.
2. Detect and stop any process holding the target port (defensively, with timeout and a clear error path if it cannot).
3. Bind to a fixed port from project config — never a randomly assigned port.
4. Open the browser only after the server is reachable on the bound port.
5. Optionally run one smoke check (HEAD /, GET /api/version) and report the result.

If the project does not have such an entry yet and the user has hit "wrong version" more than once, propose adding it before doing other work. The setup pays back across every subsequent test cycle.

### Four-Line Delivery

Before saying "preview is ready", report four lines that the user can match against the UI:

```
資料夾：<absolute path>
分支：<git branch>
commit：<short hash>
預覽網址：<url:port>
```

If any line cannot be filled in, the preview is not ready — name what's missing, do not hand over a half-known URL.

### Version Watermark

Dev/test UI should show its version in a corner badge: `branch • short_commit • build_time`. Production should not show this.

Implement once per project. After this exists, the user can confirm version visually without asking.

### Endpoint Match

If the project has a status endpoint such as `/api/version`, `/health`, or `/__version__`, verify it returns the same commit as the dev terminal before declaring preview ready. Mismatch usually means one of: another server is still running on that port, build cache is stale, wrong worktree is checked out, browser is showing a cached bundle, or a frozen executable was built from a different commit.

### When The User Reports Wrong Version

Diagnose in this sequence — do not skip to "let me find the URL":

1. Show the actual launch command and cwd of the running server (`Get-CimInstance Win32_Process` / `ps`).
2. Hit the version endpoint and read commit / branch / built_at.
3. Inspect the file the user is editing — what worktree, what branch, what commit?
4. Identify which of the three is out of sync.
5. Propose ONE durable fix (preview entry script, watermark, status endpoint) so the issue stops returning.

If you find yourself looking for "the right preview URL" more than once in a session, that's the signal to stop searching and invest in the entry script.

### Do Not Silently Switch Context

If the launch path, port, branch, or worktree differs from what the user expects, say so before launching — not after they open the URL and report "wrong version".

## Mechanism Alignment Smoke Test

Use this when a project has multiple launch scripts, old/new servers, AI agents, generated files, or migrated data.

- Start the app exactly the way the user will start it, such as a desktop shortcut, package script, service command, or deployed URL.
- Verify the server entrypoint, UI file, status endpoint, and canonical data path all name the same mechanism/version.
- Confirm legacy write paths are disabled or isolated when the user is intentionally restarting with a new data model.
- Check that the UI reloads from canonical persisted data, not only from an in-memory session.
- Run one small end-to-end fixture through the workflow before processing large real data.
- Inspect failure messages for stale model names, retired API versions, missing environment variables, and schema drift.
- For archive/reset work, prove old data is preserved for audit but excluded from active reads and downstream reports.

## Packaged Desktop-Web Delivery Checks

Use this when a local web app is delivered as `.exe` bundles, one-file packaged apps, shared folders, or per-user launchers.

- Verify the packaged launch path, not just `python app.py`.
- Confirm each profile/package opens with the correct identity, role, version title, data path, and health endpoint.
- Run batch-build dry-run first; require an explicit execute flag for mass outputs.
- Check that all output folders contain the executable and the required data/config pointer.
- Keep packaging temp/work paths out of cloud-synced directories when build tools create lock-prone files.
- Run a concurrency or multi-user smoke test when a shared SQLite/WAL database or network folder is part of the design.

## Final Delivery Alignment

Use this before declaring an internal tool ready for staff use.

- Run the package through the same launcher and folder layout staff will use.
- Confirm the visible app identity matches the active profile, role, server, and data path.
- Verify admin and staff scopes with real counts, not only page rendering.
- Verify exports and generated Excel match the same scoped records shown in the UI.
- Confirm stale files, old placeholder accounts, test databases, caches, and scratch scripts are excluded or clearly marked inactive.
- Update README, design notes, deployment summary, source snapshot, and worktree/status notes with the same date and current facts.
- Keep a pre-deploy database backup and record where it lives.
- Re-run the narrow automated suite after deployment scripts or packaging changes.

## Final Response

Tell the user:

- What changed.
- Where it changed.
- What was verified.
- Any remaining risk or command that could not be run.

Keep it short unless the user asks for details.
