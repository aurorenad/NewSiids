# SIIDS Frontend V2 Architectural Analysis

This document serves as a comprehensive analysis and backup reference for the `siidsfrontedV2` project that was built to modernize and unify the Strategic Intelligence and Investigation Division System (SIIDS).

## 1. System Architecture

The frontend was entirely rebuilt using **React + Vite**, providing a fast development environment and optimized production builds.

### Core Stack:
- **Framework:** React 18
- **Bundler:** Vite
- **Routing:** React Router v6
- **State Management / Data Fetching:** React Query (TanStack Query v5)
- **API Mocking:** Mock Service Worker (MSW) v2
- **Styling:** Pure CSS (CSS Modules & Global scoped classes)
- **Icons:** Lucide React

## 2. Directory Structure & Key Modules

```text
src/
├── api/
│   ├── client.js           # Central Axios instance with Auth/Correlation interceptors
│   └── msw/
│       ├── browser.js      # MSW worker initialization
│       └── handlers.js     # Complex mock backend simulating the entire workflow state machine
├── components/
│   ├── layout/
│   │   └── AppShell.jsx    # Global layout container with sidebar, command palette, and alerts
│   └── ui/
│       ├── SplitWorkspaceLayout.jsx # Dual-pane layout for complex case tracking
│       ├── StatusBadgeSystem.jsx    # Standardized visual badges for all workflow states
│       ├── TimelineActivityFeed.jsx # Audit trail and activity visualization
│       └── WorkflowStepper.jsx      # Progress bar for active cases
├── context/
│   ├── AuthContext.jsx         # Handles JWT simulation and role switching
│   └── NotificationContext.jsx # Global toast and alert management
└── features/
    ├── dashboard/          # Auth & Admin views (Login, ForgotPassword, AdminDashboard)
    ├── stock/              # Surveillance & PRSO views
    └── intelligence/       # Complex Intel & Investigation flow dashboards
```

## 3. Implemented Role Dashboards

We successfully built and integrated specialized views for 8 distinct roles, each secured by `ProtectedRoute` wrappers:

1. **Surveillance Officer** (`SurveillanceDashboard.jsx`): Intake and seizure logs.
2. **Stock Manager** (`StockManagerDashboard.jsx`): Manages seized goods, physical inventory, and triggers release requests.
3. **PRSO** (`PrsoDashboard.jsx`): High-level approval of releases, with delegation capabilities to Deputy PRSO.
4. **Intelligence Officer** (`IntelligenceOfficerDashboard.jsx`): Source intake, investigation strategy, and intel report drafting.
5. **Director of Intelligence** (`DoiDashboard.jsx`): Reviews, signs, and advances Intel reports to AC.
6. **Assistant Commissioner (AC)** (`AcDashboard.jsx`): Ultimate sign-off for Phase 1. Routes cases out to Director of Investigation.
7. **Director of Investigation** (`InvestigationDirectorDashboard.jsx`): Command center for Phase 2. Assigns cases to IOs, approves case plans, and signs final reports.
8. **Investigation Officer** (`InvestigationOfficerDashboard.jsx`): Executes the investigation, drafts case plans, and finalizes findings.

## 4. State Machine & Flow Dynamics

The system heavily relies on `src/api/msw/handlers.js` to simulate a robust backend state machine.

### Key Workflows Tested & Verified:
- **Phase 1 (Intel Generation):** 
  - `Intelligence Officer` -> `PENDING_DIRECTOR_SIGNATURE` -> `DIRECTOR_OF_INTELLIGENCE` -> `PENDING_AC_SIGNATURE` -> `AC` -> `APPROVED` -> Routing.
- **Phase 1 to Phase 2 Handoff:**
  - `AC` routes case -> Status `ROUTED` (routedTo: `DIRECTOR_OF_INVESTIGATION`).
- **Phase 2 (Investigation):**
  - `Director of Investigation` assigns -> `ASSIGNED_TO_INVESTIGATION_OFFICER`.
  - `Investigation Officer` submits plan -> `CASE_PLAN_SUBMITTED`.
  - `Director of Investigation` approves -> `INVESTIGATION_IN_PROGRESS`.
  - `Investigation Officer` submits final report -> `REPORT_SUBMITTED`.
  - `Director of Investigation` approves -> `REPORT_APPROVED` / routes back to AC for closure.

## 5. UI/UX Achievements
- **Command Palette:** `Ctrl + K` global navigation successfully integrated.
- **Dynamic Workspaces:** Adopted split-pane layouts (`SplitWorkspaceLayout`) allowing users to view data tables on the left and inspector panels (PDFs, forms, details) on the right without losing context.
- **Consistency:** Removed all fragmented table views and unified the system under a single premium design language.
