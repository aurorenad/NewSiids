# SIIDS Global Walkthrough & Master Refactoring Plan

This document serves as the central source of truth for the ongoing system-wide refactoring of the SIIDS (Smuggling Intelligence and Investigation Department System) platform. It outlines our core strategies, documents the changes already implemented, and charts the roadmap for future tasks. 

This is designed to provide the development team and stakeholders with full context before pushing the project to the next stage.

---

## 1. Core Refactoring Strategy & Modern Standards
The goal of this initiative is to overhaul the legacy codebase based on stakeholder feedback, ensuring the system meets modern software standards. Our strategic pillars include:

> [!IMPORTANT]
> **Key Refactoring Pillars**
> 1. **Robust State Management**: Ensuring that workflows (e.g., report submission, approval, rejection, returning) follow strict, unbreakable paths. Once an action is taken, subsequent contradictory actions must be cryptographically and visually locked out.
> 2. **Permanent Audit Trails**: Fixing backend queries so that documents/reports never "disappear" from a user's history after processing. Every touchpoint must be preserved.
> 3. **Digital Signatures & Privacy**: Moving away from placeholder text to secure, cryptographically drawn Base64 digital signatures that visually render on generated templates.
> 4. **UI/UX Standardization**: Unifying the visual language across all dashboards (Intelligence Officer, Director Intelligence, etc.) using modern Material-UI (MUI) components, dedicated full-page views (instead of cramped modals), and responsive data tables.
> 5. **Code Maintainability**: Transitioning away from scattered logic to centralized, robust backend JPQL/Native queries and clean React frontend hooks.

---

## 2. Implemented Changes (What we have done)

### A. Intelligence Officer (IO) Dashboard Overhaul
- **UI Improvements**: Upgraded the visual structure and layout to provide better visibility into ongoing cases.
- **Reporting & Filtering**: Fixed broken input fields and dropdowns, allowing officers to accurately filter and generate reports over dynamic periods (e.g., default 30 days, or custom date ranges).
- **Endpoint Security**: Investigated and resolved hidden backend conflicts causing data generation errors.

### B. Director of Intelligence (DOI) Dashboard Overhaul
- **Dedicated Editing Workflow**: Replaced small, cramped pop-up modals with a dedicated, full-screen `DirectorEditReport.jsx` page for modifying findings, recommendations, and evidence.
- **Strict State Lockdown**: Refactored the frontend constraints (`isActionDisabled`). Buttons (Approve, Reject, Return, Edit, Sign) are now strictly whitelisted and will permanently lock/gray out once a report moves past the pending state.
- **History Retention**: Fixed a critical backend bug where reports "disappeared" from the DOI's view after approval/rejection. Created a comprehensive JPQL query (`findReportsHandledByDirectorIntelligence`) so all historical interactions are preserved under the "Signed/All Reports" tabs.
- **Terminology Accuracy**: Updated the system to display *"Submitted from Intelligence Officer"* instead of *"Submitted to Director Intelligence"* for better workflow clarity.

### C. Digital Signature & Template Rendering
- **Secure Canvas Integration**: Removed hardcoded text signatures. Integrated `react-signature-canvas`, requiring directors to physically draw their signature on a secure pad.
- **Backend Bridge**: Updated `ReportResponseDTO.java` and backend mappers to securely transport historical signatures to the frontend.
- **Template Display**: Modified `ViewReportDetails.jsx` to render a **Signatures Section** at the bottom of the document. It dynamically loops through and displays the Name, Role, Timestamp, and Drawn Image of every individual who touched the document, proving chain-of-custody.

---

## 3. Current State
**We are currently at the critical transition phase between the Director of Intelligence and the downstream departments.**
The foundation for secure routing, strict state locking, and digital signatures has been successfully tested and deployed on the Intelligence Officer and Director Intelligence levels. The codebase currently compiles cleanly (`mvn compile` and `npm run build` pass with 100% success).

---

## 4. Missing Tasks & Future Roadmap (What is left)

Now that the structural blueprint is established, the team must roll out these exact standards to the remaining hierarchical dashboards.

> [!NOTE]
> **Upcoming Task List**
> - `[ ]` **Director of Investigation Dashboard**: Apply the same UI standardization, signature requirements, and strict state-locking logic implemented for the DOI.
> - `[ ]` **Assistant Commissioner Dashboard**: Ensure the Assistant Commissioner's history tracking works identically to the DOI, preventing disappearing reports and enabling template signature rendering.
> - `[ ]` **Legal Advisor Workflow**: Map out the handover process for legal review, ensuring the report templates securely lock when passed to legal.
> - `[ ]` **Investigation Officer Updates**: Sync their operational dashboard with the new visual tokens and ensure they can view the fully signed templates generated by the directors.
> - `[ ]` **System-Wide PDF Export**: Ensure the `jsPDF`/`html2canvas` logic perfectly captures the new Base64 signature grid at the bottom of the documents upon download.

---
*Documented for Team Push & Review.*
