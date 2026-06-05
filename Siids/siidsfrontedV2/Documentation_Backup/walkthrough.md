# Investigation Director Dashboard: Enum and Layout Refactoring

The dashboard has been successfully refactored to align with the core backend enums while consistently applying the requested multipage side-panel template across all investigation stages.

## What Was Changed

### Strict Backend Enum Integration
Instead of attempting to create new local status variables, we now strictly map to the exact backend case flow enums:
`SENT_FROM_AC` → `ASSIGNED_TO_INVESTIGATION_OFFICER` → `CASE_PLAN_SUBMITTED` → `CASE_PLAN_APPROVED` → `CASE_PLAN_RETURNED` → `CASE_PLAN_REJECTED` → `INVESTIGATION_IN_PROGRESS` → `REPORT_SUBMITTED` → `REPORT_APPROVED` → `REPORT_RETURNED` → `REPORT_REJECTED` → `SENT_TO_AC` → `AC_APPROVED` → `AC_RETURNED` → `AC_REJECTED`.

Each tab correctly buckets cases into their relevant stages based on these statuses.

### Stage-Specific Columns
The table views have been mapped precisely to show the most relevant data at each stage:
- **New Case (From AC)**: Focuses on Subject and displays "Not Submitted" for Case Plan and Report columns. Officer is "Unassigned".
- **Active Investigations**: Shows Assigned Officer and Case Plan Status (`Submitted`, `Approved`, `Returned`, etc.).
- **Pending Review**: Adds the Report Status column.
- **Sent to AC**: Adds the AC Status column (for cases approved by the Director and pushed to the AC level).

### Multipage Sidebar Unification
The side panel layout is now unified. When you click `Assign`, `View Case`, `View Report`, or `View Document`, the same fundamental multipage shell opens:
- `OVERVIEW`, `EVIDENCE`, `AUDIT_TRAIL`, `TIMELINE` are available from day 1 (`SENT_FROM_AC`).
- `CASE_PLAN` becomes available once the case is assigned.
- `INVESTIGATION_REPORT` and `DOCUMENTS` become available when the case moves to the report submission phase.

### Dynamic Actions
Actions inside the `CASE_PLAN` and `INVESTIGATION_REPORT` tabs dynamically appear based on the case's exact status:
- `Approve`, `Reject`, and `Return for Correction` buttons are exposed when a Case Plan or Report is submitted (`CASE_PLAN_SUBMITTED`, `REPORT_SUBMITTED`).
- `Send Report to AC` is exposed when the Director approves the report (`REPORT_APPROVED`).
- `Return to Officer` and `Modify & Resend to AC` are exposed if the case gets bounced back from the AC (`AC_RETURNED`).
- If a document is out of the Director's hands (e.g., `SENT_TO_AC`), it simply displays a status banner stating the document has been sent upstream.

## Verification
- We verified that the underlying `mockCases` data matches the exact backend enums.
- We confirmed the data flows properly through the tabs.
- We verified the React build completes successfully without errors, meaning the dynamic conditional rendering syntax is robust.

You can now test the various mockup cases across the 4 stages to ensure both "best case" flows and "worst case" (returns/rejections) handle cleanly!
