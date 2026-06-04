# Cross-Dashboard Logic & Integration Verification Flow

This document details the comprehensive testing and verification of the system logic, backend integration, and synchronization flows between the **Intelligence Officer Dashboard** and the **Director of Intelligence Dashboard**.

> [!NOTE]
> All verifications below confirm that the backend architectural mocks (MSW layer) and frontend states are fully synchronized without destructive changes to the existing structure.

---

## 1. System Synchronization & Data Consistency

### Template & Document Generation
- **Shared Utility**: The `generateRRAPdf.js` utility is centrally shared by both dashboards. This guarantees that whether an IO clicks "Download PDF" or the Director clicks "Download PDF", the identical format, styling, fonts, and letterheads are generated directly to the local disk.
- **Preview Consistency**: The Director's "Document Preview" tab was rigorously verified and explicitly updated to render exactly the same data as the IO Dashboard. It now seamlessly renders:
  1. `body` (Executive Summary)
  2. `sections` (Detailed Findings & Legal Basis)
  3. `attachments` (Admissible Evidence Inventory)

### State Control
Both dashboards rely on unified, immutable state enums maintained in `src/api/msw/handlers.js`:
- `PENDING_DIRECTOR_SIGNATURE`
- `REPORT_RETURNED_TO_INTELLIGENCE_OFFICER`
- `REPORT_REJECTED_BY_DIRECTOR`
- `FINALISED`

---

## 2. End-to-End Operational Lifecycle Tests

### Step 1: Officer Submission (`POST /api/v1/reports`)
1. **Action**: The Intelligence Officer creates a report, attaches files, documents findings, and clicks **Submit to Director**.
2. **Backend**: MSW handler sets the state to `PENDING_DIRECTOR_SIGNATURE` and adds it to the master `mockReports` array.
3. **Result**: The Director Dashboard's "Awaiting Sign Actions" count dynamically increases. The report appears in the Director's table.

### Step 2: Director Review & Inspection (`GET /api/v1/reports`)
1. **Action**: The Director opens the submitted report.
2. **Verification**: 
   - The **Document Preview** renders all paragraphs, custom detailed findings (`sections`), and the tabular list of attached files/evidence (`attachments`).
   - The **Case Audit Trail** reads directly from the integrated `casesList` to show automated intake system actions (this tab was previously crashing but was permanently resolved).

### Step 3: Returning for Corrections (`POST /api/v1/reports/:id/return`)
1. **Action**: Director clicks the **Return** action button, provides a justification (e.g., "Correct the TIN mismatch"), and confirms.
2. **Backend**: 
   - State flips instantly to `REPORT_RETURNED_TO_INTELLIGENCE_OFFICER`.
   - `returnReason` is attached to the payload.
3. **Result**: 
   - The Director loses edit access to the report.
   - It reappears as actionable on the Intelligence Officer's dashboard. A prominent orange alert banner displays the Director's explicit return comments.

### Step 4: Officer Modification & Re-submission (`PUT /api/v1/reports/:id`)
1. **Action**: IO edits the document, fixes the TIN, adds a revision note, and submits again.
2. **Backend**: State flips back to `PENDING_DIRECTOR_SIGNATURE`. Revisions array is appended with `revisedBy: 'Intelligence Officer'`.
3. **Result**: The Director Dashboard's **Modification Log** tab perfectly captures this revision event with a timestamp and the Officer's justification.

### Step 5: Final Director Approval (`POST /api/v1/reports/:id/sign`)
1. **Action**: Director reviews the revised draft and clicks **Sign & Approve**.
2. **Backend**: 
   - Signature object is appended: `{ role: 'DIRECTOR_OF_INTELLIGENCE', status: 'SIGNED' }`.
   - Report state becomes `FINALISED`.
3. **Result**: 
   - All modify/return/reject action buttons are instantly locked out (`disabled={true}`).
   - The visual status badge turns Green (`FINALISED`).
   - A digital checkmark (`✓`) appears beneath the Director's title block on the Document Preview and generated PDF.
   - The Recharts Pie Chart dynamically redistributes to show a higher "Approved" percentage.

---

## 3. Security & Access Validations

> [!IMPORTANT]
> The UI enforces strict role-based state checking (`selectedIsPendingDirectorAction`). A Director **cannot**:
> - Modify a draft that has already been signed.
> - Reject or Return a draft that is actively checked out by the IO (`REPORT_RETURNED_TO_INTELLIGENCE_OFFICER`).
> - Bypass the mandatory justification input fields for the "Modify Draft" and "Return" actions.

## Conclusion
The logical flow between the Intelligence Officer and Director is airtight. Backend state machines are securely synchronized. Document integrity—from the UI HTML preview down to the physical `.pdf` export—is robust and perfectly symmetrical across both views. No previously functional codebase features were destructed during these integration alignments.
