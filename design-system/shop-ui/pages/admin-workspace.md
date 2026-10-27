# Aydibro / Admin Workspace

Admin extends the existing Aydibro system rather than replacing the storefront.
Use Be Vietnam Pro, navy ink, white panels, quiet gray canvas and cobalt only
for navigation/focus/action. Product photography remains API-owned S3 media.

- Persistent 232px desktop sidebar, separate internal topbar and clear route
  labels. On mobile, use horizontally scrollable navigation within its own
  container and retain an explicit way back to the storefront.
- Dashboard figures reflect actual API totals. Inventory total counts SKU ×
  location records, not the sum of all units. No invented revenue, sparklines,
  sales change percentages or activity feed.
- Desktop data tables use meaningful captions/headers and bounded horizontal
  scroll containers. Product listing switches to a semantic list on mobile.
- Inputs have visible labels, native constraints and 44px minimum actions.
  Error summaries retain input and receive focus after failed submit. Native
  dialogs support Escape and focus return; publish/hide/delete are explicit.
- Version conflicts never silently update form fields or overwrite data. A
  user-confirmed reload discards drafts and reads the latest version. Metadata
  form versions can advance after SKU-only updates only when the original
  server metadata matches; concurrent metadata changes retain the old version.
- Private controls follow backend capabilities, not a role-name shortcut.
  Hide inaccessible controls and block deep links before rendering pages.
  UI checks never replace server authorization.
- Mutations share a pending scope per actor, have no automatic retry, and
  invalidate relevant public/private queries after server confirmation. A
  timeout asks the operator to read current state before trying again.

Source decisions and verification: `docs/admin-workspace.md`. Local fixture
screenshots are design evidence and never imply real production admin data.
