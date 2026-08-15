# Frontend Product Design

> **規則權威位置（2026-08-15 收斂）**
> 本檔沿用自舊技能，講的是**要交付的真實產品介面**。
> 下列主題不以本檔為準：
> - 元件狀態清單（空／載入／錯誤／無權限／未存／已存／停用／成功）→〔`SKILL.md` 第七節〕
> - 客戶展示頁的擬真做法與擬真度自評表 →〔`client-demo.md`〕
> - 協作確認台的版面與結構 →〔`review-console.md`〕
>
> 本檔與它們衝突時，以它們為準。

Use this for web apps, dashboards, tools, admin systems, public sites, and interactive experiences.

## Product Fit

Match the UI to the domain:

- Operational tools: dense, calm, scannable, predictable, task-first.
- Legacy Excel replacements: keep the staff's daily list, filters, searching, and row scanning familiar while moving risky logic into clearer software states.
- Internal administrative tools for older or mixed-comfort staff: larger text, obvious targets, low page switching, stable table layouts, and direct editing for frequent fields.
- Dashboards: summarize, compare, drill down, and act.
- Forms: reduce cognitive load, group fields by user thought process, preserve progress.
- Creative/portfolio/brand sites: visual identity and first-viewport signal matter.
- Games/interactive demos: direct manipulation, motion, feedback, and clear rules matter.

## First Screen Rule

If asked for an app/tool/dashboard/system, make the first screen the actual working experience.

If asked for a landing page or branded site, the first viewport must clearly show the brand/product/person/place/object and hint at the next section.

## Layout Principles

- Use full-width sections or unframed layouts for page structure.
- Use cards for repeated items, modals, and genuinely framed tools, not every section.
- Do not put cards inside cards.
- Keep text sized to context: compact panels need compact headings.
- Define stable dimensions for fixed-format elements.
- Prevent text overlap and button label clipping at mobile and desktop widths.
- Avoid one-note palettes and generic purple/blue gradient dominance unless the brand requires it.

## Controls

Prefer familiar controls:

- Tabs for major views.
- Segmented controls for modes.
- Menus/selects for option sets.
- Toggles/checkboxes for binary state.
- Inputs/steppers/sliders for numbers.
- Icon buttons for common actions, with accessible names/tooltips.
- Text buttons for explicit commands.

## Administrative Workbench Pattern

Use this when the user wants Excel-like efficiency without turning the whole product into a spreadsheet.

- Put the daily work surface on one screen: summary counts, warnings, editable rows, and detail inspection.
- Direct-edit only frequent, short, low-ambiguity fields such as status, assigned staff, transport type, meal category, times, and confirmation state.
- Put long text, history, risk notes, and complex support needs in a side panel or modal tied to the selected row.
- Group related people or records visually when the user's real work is household/case/group based, while preserving row-level data.
- Keep warnings close to the row they affect and repeat severe issues in a fixed summary area.
- Support batch actions for repeated administrative tasks, but require clear selected-record feedback before applying them.
- For older staff, prefer larger baseline type, taller controls, clear contrast, and fewer hidden hover-only affordances.

## Legacy Excel Replacement Pattern

Use this when replacing a working workbook or VBA tool.

- Make the first screen the real work list when that was the old system's home base. Avoid replacing a familiar operational table with a decorative dashboard.
- Preserve scanning behaviors: sortable/filterable columns, search, pagination, row status, completeness, and direct access to the central processing page.
- A single central processing page can support multiple modes through an explicit process selector and mode-specific action buttons when the old workflow revolved around one form.
- Keep field groups close to the user's mental model from the old form, then improve validation, warnings, audit trail, and derived context around it.
- Use role-aware masking for cross-boundary hints: show that a relation, household, risk, or duplicate may exist without exposing protected fields to unauthorized users.
- Treat incomplete-data lists as workflow nudges unless the domain explicitly requires a blocking gate.
- Prefer readable table or side-panel relationship maintenance before adding diagrams; correctness and auditability come first for operational staff.

## Screen States

Complete screens include the states users naturally encounter:

- Empty
- Loading
- Error
- No permission
- Dirty/unsaved
- Saving
- Saved
- Disabled
- Partial/incomplete
- Success/complete

## Copy

- Use user-language labels instead of implementation terms.
- Keep instructions short and close to the risky action.
- Avoid in-app text that merely explains visual design or obvious functionality.
- Make destructive or irreversible actions explicit.

## Visual Verification

For meaningful UI work:

1. Run the app.
2. Open the changed screen in a browser.
3. Check desktop and a narrow viewport.
4. Verify no blank canvas, clipped text, overlapping panels, hidden controls, or layout jumps.
5. Exercise the main interaction, not only the static page.
