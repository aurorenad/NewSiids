# SIIDS FrontendV2 Enterprise UX/UI Execution Blueprint

Rwanda Revenue Authority (RRA) · Intelligence & Enforcement Division
**Document Reference**: RRA-SIIDS-UI-V2.0  
**Classification**: CONFIDENTIAL  

---

## 1. Visual Design System Specification

The visual identity of SIIDS FrontendV2 represents an authoritative, secure, and clean digital workspace. It balances light-neutral primary workspaces with structured glassmorphism overlays and strategic RRA blue indicators to manage user attention.

### 1.1. Color System (CSS Variables)

```css
/* siidsfrontendV2/src/theme/variables.css */
:root {
  /* Brand Identity Colors */
  --primary-brand: #0D47A1;       /* RRA Navy Blue - Sidebar & Focus indicators */
  --primary-accent: #1565C0;      /* RRA Slate Blue - Secondary navigation */
  --background-main: #F5F7FA;     /* Light Neutral background - High contrast readability */
  --background-sidebar: #0A2E66;  /* Deep Navy - Grounded sidebar container */
  
  /* Surface Layers (Glassmorphism Tokens) */
  --background-panel: rgba(255, 255, 255, 0.72);
  --background-card: rgba(255, 255, 255, 0.85);
  --background-dropdown: rgba(255, 255, 255, 0.90);
  --glass-blur: blur(12px) saturate(130%);
  --glass-border: rgba(255, 255, 255, 0.25);
  --panel-border: 1px solid rgba(226, 232, 240, 0.8);
  --shadow-subtle: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  --shadow-glass: 0 8px 32px 0 rgba(13, 71, 161, 0.06);

  /* Typography & Core Scale */
  --text-primary: #1E293B;        /* Slate 800 - Primary text */
  --text-secondary: #64748B;      /* Slate 500 - Secondary descriptors */
  --text-muted: #94A3B8;          /* Slate 400 - Timestamps & helper logs */
  
  /* Status Colors */
  --success-color: #2E7D32;       /* Forest Green - Approved / Finalised / OTP Verified */
  --success-bg: rgba(46, 125, 50, 0.08);
  --warning-color: #FFB300;       /* RRA Gold - Escalation Warning / Revision Needed */
  --warning-bg: rgba(255, 179, 0, 0.08);
  --danger-color: #D32F2F;        /* Crimson Red - Escalated overdue / Revoked */
  --danger-bg: rgba(211, 47, 47, 0.08);
  --info-color: #0288D1;          /* Cerulean Blue - Routing department / Active Delegations */
  --info-bg: rgba(2, 136, 209, 0.08);
}
```

### 1.2. Design System Tokens & Hierarchy
*   **Typography**: Clean sans-serif hierarchy (e.g. *Inter* or *Outfit* google fonts).
    *   `font-size-base`: `14px` (ideal for high-density tables and logs).
    *   `font-size-heading`: `18px` (section title), `24px` (primary dashboard indicators).
*   **Spacing Units**: `4px` grid system.
    *   Padding inside components uses logical steps: `8px`, `12px`, `16px`, `24px`.
*   **Radius Standards**: Consistent `8px` or `12px` rounded boundaries for cards and panels.
*   **Dark/Light Mode Definition**: To maintain regulatory compliance, the workspace operates in a clean light mode by default. Custom styling keys adapt variables when dark styling classes are toggled:
    ```css
    .dark-theme {
      --background-main: #0F172A; /* Dark Slate 900 */
      --text-primary: #F8FAFC;
      --text-secondary: #94A3B8;
      --background-panel: rgba(30, 41, 59, 0.72);
      --glass-border: rgba(255, 255, 255, 0.1);
      --panel-border: 1px solid rgba(51, 65, 85, 0.8);
    }
    ```

---

## 2. Enterprise Layout & Workspace Navigation Philosophy

The layout is built around the **Command Center Navigation Pattern**, grouping modules logically and minimizing context switching.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo] SIIDS  | Search...   (Ctrl+K)              [🔔 3]  [Profile V]  │ (Global Header)
├───────────────┬────────────────────────────────────────────────────────┤
│ 👤 Auth       │                                                        │
│ 📂 Cases      │                  LEFT PANE (60% Width)                 │
│ 📝 Reports    │                                                        │
│ 📦 Stock      │       Lists, Tables, Search, Filter Toolbars           │
│               │                                                        │
│ Settings      ├────────────────────────────────────────────────────────┤
│ (Active       │                  RIGHT PANE (40% Width)                │
│  Delegation:  │                                                        │
│  Badge)       │      Workspaces, Action Panels, Document Snapshots     │
└───────────────┴────────────────────────────────────────────────────────┘
```

### 2.1. Inline Dual-Column Split Workspace
To prevent navigation fatigue, workspaces are split vertically on desktop resolutions:
*   **Left Column (60% Width)**: Features a robust tabular list of active entities (cases, report drafts, inventory stock) with advanced filtering.
*   **Right Column (40% Width)**: Acts as the workspace inspector. Selecting a row in the left column loads the active detail card, document preview, workflow progress indicator, and action console in the right column.
*   **Responsive Transition**: If screen resolution drops below `1280px` (e.g. standard tablets), the workspace automatically shifts to a slide-over pane (drawer) approach to conserve space.

### 2.2. Navigation Sections
1.  **Sidebar Nav**: Deep blue background with high contrast white text. Separates navigation modules cleanly:
    *   *Workspace Overview*: Role-specific dashboards.
    *   *Intelligence Operations*: Revisions, Draft reports, and signature locks.
    *   *Surveillance & Stock*: Seizure entries, PV generation, and release queues.
    *   *System Admin*: Delegation triggers, logs, and profile management.
2.  **Breadcrumb Navigation**: Shows path tracking dynamically (e.g. `Stock Operations > Main Stock > Goods PV-9948`).

---

## 3. Role-by-Role Dashboard Structure

### 3.1. Surveillance Officer Dashboard
*   **Actionable KPI Cards**:
    *   `Active Seizures`: Count of items created within the active shift.
    *   `OTP Verifications Pending`: Count of active verification SMS processes.
    *   `Days in Stock warning alerts`: Count of items in temporary stock approaching 5 days.
*   **Left Workspace Column**: Active temporary stock list showing item name, PV reference, days elapsed, and status tags.
*   **Right Workspace Column**: Live Seizure Note details, active verification wizard (with resend OTP triggers), or Return-to-Owner authorization panel.
*   **Reports/Analytics Widget**: Bar charts plotting monthly seizures by reason code and total fines collected.

### 3.2. Stock Manager Dashboard
*   **Actionable KPI Cards**:
    *   `Main Stock Inventory`: Total count of active items in storage.
    *   `Release Approvals Pending`: Count of requests sent to PRSO awaiting validation.
    *   `Escalated Intake Pending`: Escalated PVs requiring manager intake signature.
*   **Left Workspace Column**: Main inventory grid, sortable by intake date and category.
*   **Right Workspace Column**: Release Request creator wizard, detailing buyer, proposed auction price, and law references.
*   **Reports/Analytics Widget**: Pie chart tracking goods category distribution and weekly release volume.

### 3.3. Assistant Commissioner (AC) Dashboard
*   **Actionable KPI Cards**:
    *   `Pending Case Assignments`: Count of new files awaiting destination routing.
    *   `Reports Awaiting Signature`: Intelligence files requiring AC sign-off.
    *   `Financial Summary (RWF)`: Month-to-date fine collections.
*   **Left Workspace Column**: Multi-tab list (Tab 1: Unassigned Cases, Tab 2: Reports Awaiting Sign-off).
*   **Right Workspace Column**: Split viewer showcasing compiled Intelligence Reports and Case Routing selectors.
*   **Reports/Analytics Widget**: Case distribution charts showing workloads by downstream departments.

### 3.4. Director of Intelligence Dashboard
*   **Actionable KPI Cards**:
    *   `Reports Awaiting Signature`: Reports signed by the AC, pending DOI review.
    *   `Revision Drafts Active`: Tracked edit drafts.
    *   `Finalised Reports This Week`: Volume of complete files.
*   **Left Workspace Column**: Reports grid filterable by status and type.
*   **Right Workspace Column**: Workspace inspector featuring the active revision history timeline, editable document preview pane, and dual-signature approval triggers.

### 3.5. PRSO / Deputy PRSO Dashboard
*   **Actionable KPI Cards**:
    *   `Release Requests Active`: High priority approval list.
    *   `Exception Cases Pending`: Appeals and reduced fine disputes.
    *   `Delegation Status`: Active indicator showing who holds active approval tokens.
*   **Left Workspace Column**: Action queue sorted by submission timestamp.
*   **Right Workspace Column**: Action console to review release files, input exceptions, or delegate approvals.

---

## 4. Recharts Analytics Strategy

Visualizations must remain clean, minimal, and informative. No decorative charts are permitted.

```
                  ┌──────────────────────────────────────┐
                  │          Financial Summary           │
                  ├──────────────────────────────────────┤
                  │ 15M RWF 📈                           │
                  │                                      │
                  │   /\      /\                         │
                  │  /  \    /  \    /\                  │
                  │ /    \__/    \  /  \                 │
                  │/              \/    \                │
                  │ Jan   Feb   Mar   Apr                │
                  └──────────────────────────────────────┘
```

### 4.1. Chart Types & Integration Guidelines
1.  **Line/Area Charts**: Use to plot trends (e.g. Monthly Seizures, Fines Collection Trends).
    *   *Configuration*: Smooth curve interpolations, subtle primary blue accent strokes, and light grey gridlines.
2.  **Bar Charts**: Use for category comparisons (e.g. Seizures by Location, Workflow Throughput).
    *   *Configuration*: Single color bars with thin border strokes.
3.  **Donut/Pie Charts**: Use to display distributions (e.g. Goods Category, Case Status).
    *   *Configuration*: Clear legends, minimal labels, and maximum 5 category slices to maintain readability.

### 4.2. Analytics Toolbar
Charts must support interactive toolbars containing:
*   *Time-Range Switches*: 7 Days, 30 Days, Year-to-Date, and Custom range.
*   *Export Control*: Download PNG, PDF, or raw CSV data.

---

## 5. Real-Time Experience (SSE-to-Toast Architecture)

The system relies on a Server-Sent Events (SSE) stream to deliver real-time updates and notifications.

### 5.1. Notification Severity Levels
*   `INFO` (Blue): Standard updates (e.g. *Case routed to Prosecution*).
*   `SUCCESS` (Green): Completed tasks (e.g. *OTP Verification Successful*).
*   `WARNING` (Gold): Action items (e.g. *Stock PV-9941 approaching Day 5 limit*).
*   `CRITICAL` (Red): Overdue actions or errors (e.g. *PRSO Release Request Rejected*).

### 5.2. Toast Alert UX & Grouping
*   **Toast Triggers**: Incoming SSE messages trigger temporary non-blocking toast alerts in the bottom-right corner of the viewport.
*   **Grouping**: If multiple alerts of the same type arrive (e.g., 5 new stock arrivals), they group into a single notification summary card (*"5 new items arrived in Main Stock"*).
*   **Persistent Center**: The notification bell dropdown provides history tracking with action routes (e.g., *"Click to view case"*).

---

## 6. Smart Table Architecture

Data tables are designed to handle large datasets efficiently while maintaining a high information density.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search Ref...] [Filter: Seizure Date 📅] [Sort By: Ref Num ▾]     │
├─────────────────┬──────────┬──────────┬─────────────┬──────────────────┤
│ Reference Num   │ Type     │ Location │ Date        │ Status           │
├─────────────────┼──────────┼──────────┼─────────────┼──────────────────┤
│ PV-2026-9948    │ Vehicle  │ Gikondo  │ 2026-05-28  │ PENDING_RELEASE  │
│ PV-2026-9941    │ Electronics│ Rubavu │ 2026-05-27  │ MAIN_STOCK       │
└─────────────────┴──────────┴──────────┴─────────────┴──────────────────┘
```

### 6.1. Smart Table Features
*   **Table Virtualization**: Large listings (1000+ items) use window virtualization libraries to render only the visible rows, preventing browser lag.
*   **Sticky Headers**: Keep columns aligned during scroll actions.
*   **Interactive Row Actions**: Contextual menus (double-click or right-click) allow users to run actions without opening detail pages.
*   **Persistent Controls**: Pagination, active filters, and search inputs are preserved in the URL query string, allowing users to share links directly.

---

## 7. Reusable Component Catalog

The following core components must be created and registered inside the global UI directory:

### 7.1. WorkflowStepper
*   **Properties**: `steps: string[]`, `activeStep: number`, `escalated: boolean`
*   **Description**: Renders horizontal sequences showing progress through workflow states. Highlights warning states in gold or overdue transitions in red.

### 7.2. TimelineActivityFeed
*   **Properties**: `activities: ActivityItem[]`
*   **Description**: Vertically stacked lists showing action history with dates, times, users, and correlation logs.

### 7.3. StatusBadgeSystem
*   **Properties**: `status: string`, `theme: 'default' | 'glass'`
*   **Description**: Returns badges colored according to status (e.g. `FINALISED` in green, `DRAFT` in grey).

### 7.4. GlassMetricCard
*   **Properties**: `title: string`, `value: string | number`, `changePercent: number`, `icon: ReactNode`
*   **Description**: High visual density card rendering core KPIs.

### 7.5. SplitWorkspaceLayout
*   **Properties**: `leftPane: ReactNode`, `rightPane: ReactNode`
*   **Description**: Manages the dual-column grid workspace structure on desktop layout.

### 7.6. ReportPreviewPanel
*   **Properties**: `reportId: number`, `onSign: () => void`, `showRevisions: boolean`
*   **Description**: Renders PDF templates side-by-side with data forms.

### 7.7. AuditTrailViewer
*   **Properties**: `actorId?: number`, `entityId: number`, `entityType: string`
*   **Description**: Tabular log interface showcasing historical actions.

### 7.8. OTPVerificationWizard
*   **Properties**: `phone: string`, `context: string`, `onSuccess: (token: string) => void`, `onSkip: () => void`
*   **Description**: Interactive wizard managing OTP entry and SMS resend counters.

---

## 8. UX Architecture Details

### 8.1. Loading and Error States
1.  **Skeleton Loaders**: Avoid full-page loading indicators. Tables, dashboards, and details load using light grey pulse placeholders to show layout structures before data arrives.
2.  **Error Boundaries**: Feature modules (such as Recharts widgets or PDF viewers) are wrapped in React Error Boundaries. If a widget fails, it shows a localized reload panel without breaking the main workspace.

### 8.2. Search and Commands (Command Palette)
*   Pressing `Ctrl + K` (or `Cmd + K`) opens a global search command palette.
*   Users can quickly search records or run action commands (e.g., *"Go to Stock Approvals"*, *"Find Case PV-9948"*) from anywhere in the application.

### 8.3. Accessibility (a11y)
*   **Keyboard Navigation**: All interactive elements (buttons, inputs, tabs) support standard focus outlines (`:focus-visible`) and keyboard controls (`Enter`, `Space`, `Arrow Keys`).
*   **Semantic HTML**: Ensure proper HTML structure using `<main>`, `<section>`, `<nav>`, and appropriate heading structures (`h1` through `h4`).
