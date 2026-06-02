# Dashboard Refactoring Documentation

This document serves as a continuous log of all modifications, logic enhancements, and UI upgrades implemented across the various dashboards in the Siids application, organized dashboard by dashboard.

---

## 1. Intelligence Officer (IO) Dashboard
**Status:** Completed

### UI & Layout Overhaul
- **Split Workspace Layout:** Transformed the traditional full-page table listing into a modern, dual-pane layout using `SplitWorkspaceLayout`. Clicking on any case record smoothly expands a detailed "Right-Pane" inspector without forcing the user to leave the page context.
- **Glassmorphism Theme:** Introduced clean, semi-transparent "glass-panel" aesthetics across cards and forms to align with the enterprise design standards seen in the V2 prototype.
- **Clear Information Grouping:** Reorganized the detailed inspector into logical sections (e.g., Status Badge, Case Information, Target Taxpayer Profile, Evasion Details & Evidence Summary).

### Backend & Endpoint Integration
- **Original Document Preservation:** Altered `ReportService` file handling to safely prepend a `UUID` to incoming uploads. This robustly prevents file name collisions on the server while preserving the `original_filename` for the end-user.
- **Dynamic PDF Report Generation:** 
  - Integrated `Thymeleaf` HTML-to-PDF rendering in the backend. 
  - Created a robust `POST /api/reports/{id}/generate` endpoint to map backend data (signatures, timestamps, case variables) directly onto an official RRA template (`investigation-report.html`).
- **Cross-Department Routing Prep:** Built a flexible `PATCH /api/cases/{id}/route` endpoint and `RoutedTo` enum allowing finalized cases to be transitioned cleanly to distinct enterprise departments (like Investigation and Enforcement).

### User Workflow Enhancements
- **Drafting vs Generating:** Clarified the button linguistics for better UX. The button to fill out the form is now labeled **"Create Findings Report"**.
- **Instant PDF Download:** Added a seamless **"Generate Final Report"** button explicitly bound to cases with an associated `reportId`. Utilizing a `blob` response type in the frontend API (`caseApi.jsx`), this button allows the IO to instantly render and download the official PDF directly to their browser without intermediate steps.
- **Excel Report Analytics Modal Overhaul:** 
  - Restructured the "Generate Excel Report" modal to fix overlapping fields and destructive CSS behaviors on the drop-downs. Switched layout to properly scoped MUI `TextField select` components.
  - Implemented dynamic, real-time filtering: The `Report Preview` case counts at the bottom of the modal now automatically recount themselves natively in the browser as the user types a case number or changes a date filter, proving that the multi-category Excel export will extract the correct parameters.
- **Error Mitigation:** Identified and patched missing internal security imports (`@PreAuthorize`) and corrected DTO mapping handlers (`CaseController`) to ensure flawless API communication between the React frontend and Spring Boot backend.

---

## 2. Director of Intelligence (DOI) Dashboard
**Status:** Pending (Next in Queue)

*Documentation for this dashboard will be populated as the refactoring phase progresses.*

---

## 3. Assistant Commissioner (AC) Dashboard
**Status:** Pending

*Documentation for this dashboard will be populated as the refactoring phase progresses.*

---

## 4. Director of Investigation Dashboard
**Status:** Pending

*Documentation for this dashboard will be populated as the refactoring phase progresses.*

- **API Mismatch Resolved:** Detected and fixed a critical runtime error where ReportApi.checkEditPermission was called instead of the exported getEditPermission, preventing users from editing reports.
