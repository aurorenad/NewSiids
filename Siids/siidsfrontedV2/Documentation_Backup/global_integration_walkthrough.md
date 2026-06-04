# Global Intelligence Workflow Documentation

This document outlines the fully synchronized, end-to-end process of the **RRA Strategic Intelligence Reporting Workflow**. The system successfully unites three core operational dashboards—Intelligence Officer, Director of Intelligence, and Assistant Commissioner (AC)—into a highly responsive, state-managed pipeline.

## 1. State Synchronization Overview

The system utilizes an in-memory mock backend (MSW) to mimic a live enterprise database. The `status` of an Intelligence Report and its parent Case perfectly determine who has jurisdiction over the document at any given time.

### The Linear Happy Path
1. **Intelligence Officer**: Drafts a report, attaches evidence, and hits "Submit Report".
   * *System State*: `PENDING_DIRECTOR_SIGNATURE`
2. **Director of Intelligence**: Reviews the report in their Dashboard. If acceptable, they click "Sign & Approve".
   * *System State*: `PENDING_AC_SIGNATURE`
3. **Assistant Commissioner**: Views the finalized draft. They click "Final Approval (Sign)".
   * *System State*: `FINALISED`

### UI Integrity & Locking
Once a document is forwarded to a higher authority, the previous actors **lose editing privileges**. 
For example, when a document hits `PENDING_DIRECTOR_SIGNATURE` or `FINALISED`, the Intelligence Officer will see an "Awaiting Validation" or "Final Sign-off Locked" badge, and all `Save Edit` buttons are securely disabled.

---

## 2. Live Notifications System

To replicate a true multi-user enterprise environment, a **Live Notification Polling System** has been integrated into the `AppShell`.

> [!TIP]
> **How to Test Live Notifications:**
> Because the mock database runs in your browser memory, you should test this by navigating between routes (e.g., `/ac` and `/officer`) **in the same browser tab**.

The application header polls the mock server (`/api/v1/notifications`) every 5 seconds. If a high-level action occurs, it triggers a live Toast alert and increments the notification Bell counter across the application.

### The "Worst-Case" Feedback Loop
If an intelligence report contains errors, higher authorities can reject it or return it for correction.

#### Scenario A: Director Rejects the Report
* The Director clicks "Reject" and provides a reason.
* *System State changes to:* `REPORT_REJECTED_BY_DIRECTOR`
* MSW dispatches a notification: `"Report [...] was permanently REJECTED. Reason: [...]"`.
* The Intelligence Officer receives a red `DANGER` alert in their dashboard.

#### Scenario B: Assistant Commissioner Returns for Correction
* The AC clicks "Return to DOI" and provides a reason.
* *System State changes to:* `REPORT_RETURNED_TO_INTELLIGENCE_OFFICER`
* MSW dispatches a notification: `"Report [...] was RETURNED for correction."`
* The Intelligence Officer receives an orange `WARNING` alert. 
* **Self-Healing State**: Because the state is now `RETURNED`, the Intelligence Officer's dashboard explicitly re-enables the `Edit Document` capabilities, allowing them to fix the errors and hit "Re-Submit", resetting the cycle.

---

## 3. UI/UX Consistency Resolved

During this integration phase, several hidden UI conflicts were resolved to ensure absolute consistency:
* **API Standardization**: The AC and DOI dashboards now hit uniform action endpoints (`/sign`, `/reject`, `/return`), guaranteeing the state machine behaves identically regardless of who triggers the action.
* **Resubmission Logic**: The IO dashboard's "Edit Report" function explicitly updates the state back to `PENDING_DIRECTOR_SIGNATURE` to ensure the report securely re-enters the review pipeline.
* **Visual Parity**: The tabbed Inspector Panels (Findings Document, Evidence Attachments, Audit Timeline) behave flawlessly and predictably across all three operational views.


## 4. Investigation Director Lifecycle Refactoring

The Investigation Director Dashboard has been refactored into a rigorous state machine with a dynamic, tab-driven layout to handle cases as they progress through 4 major stages:

1. **New Cases (From AC)**: Unassigned cases that require a designated Investigation Officer.
2. **Active Investigations**: Cases where an officer is assigned, and a Case Plan is either in progress or actively approved.
3. **Pending Review**: Submitted reports or case plans awaiting the Director's explicit review.
4. **Sent to AC / Finalized**: Approved and forwarded cases.

A global **All Cases** view is also provided to override the stage filtering and allow sweeping global queries (like filtering by year or search term).

### Stage Gates & State Management
All actions strictly mutate a single source of truth enum for status:
- ASSIGNED_TO_INVESTIGATION_OFFICER`n- CASE_PLAN_SUBMITTED / CASE_PLAN_RETURNED / CASE_PLAN_REJECTED / CASE_PLAN_APPROVED`n- INVESTIGATION_IN_PROGRESS`n- REPORT_SUBMITTED / REPORT_RETURNED / REPORT_REJECTED / REPORT_APPROVED`n- SENT_TO_AC / AC_APPROVED / AC_RETURNED / AC_REJECTED`n
Action forms, modals, and conditional UI blocks strictly read this state and map mutation endpoints identically (e.g., separating case plan endpoint logic from final report endpoint logic, even within the same modal overlays).


## 5. Investigation Officer Dashboard Integration

The Investigation Officer Dashboard has been completely rebuilt to share the exact same UI/UX framework as the Director of Investigation dashboard, closing the loop on the intelligence lifecycle.

### The 4-Card Sequential Workflow
1. **Assigned Cases (Drafting Case Plan):** Cases freshly assigned to the officer, or Case Plans returned for correction.
2. **Active Investigations:** Cases where the Director has explicitly approved the Case Plan, permitting the officer to execute the investigation and draft the final report.
3. **Pending Review:** Cases currently locked in the Director's inbox awaiting sign-off.
4. **Completed:** Fully finalized investigations (Approved by Director and AC).

### Dynamic Action Engine
The Inspector Panel automatically adapts its input fields based on the state machine:
- If the case is ASSIGNED_TO_INVESTIGATION_OFFICER, the 'Case Plan' tab renders a text editor. Upon submission, it fires POST /api/v1/reports with isCasePlan: true, advancing the state to CASE_PLAN_SUBMITTED.
- Once approved (INVESTIGATION_IN_PROGRESS), the 'Final Report' tab unlocks its text editor.
- If any document is rejected or returned, the officer receives a live notification and the respective editor unlocks again with a warning banner.

