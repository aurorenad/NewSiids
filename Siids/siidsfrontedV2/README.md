# SIIDS FrontendV2 Enterprise Workspace

Rwanda Revenue Authority (RRA) · Intelligence & Enforcement Division
**Codebase Identifier**: `siidsfrontedV2`

This directory houses the modernized, enterprise-grade user interface for the Strategic Intelligence & Investigation Division System (SIIDS). It is constructed as a React Single Page Application (SPA) utilizing Vite, React Router v7, TanStack Query, Recharts, and a local Mock Service Worker (MSW) layer for offline testing.

---

## 1. Quick Start & Setup

### Prerequisites
*   **Node.js**: Version 18.x or 20.x
*   **Package Manager**: `npm`

### Installation & Execution
Initialize the directory dependencies and run the local development server:
```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server (port 2006 by default)
npm run dev

# 3. Build production bundle (transpiled assets in /dist)
npm run build
```

---

## 2. Directory Layout
Development is organized using a **Feature-based directory structure** to decouple functional modules.

```
siidsfrontedV2/
├── public/                 # Static assets, favicon, mockServiceWorker.js (MSW)
├── src/
│   ├── api/
│   │   ├── msw/            # Mock Service Worker handlers & client mocks
│   │   │   ├── browser.js  # MSW worker configuration
│   │   │   └── handlers.js # OTP, releases, reports mock REST intercepts
│   │   └── client.js       # Custom Axios instance with interceptors
│   ├── assets/             # RRA logos, brand images
│   ├── components/         # Shared UI components (Button, Modal, Stepper)
│   │   ├── ui/             # Form elements and panels
│   │   └── visual/         # Timelines and status chips
│   ├── context/            # AuthContext, NotificationContext (SSE stream listener)
│   ├── features/           # Modular Functional Areas
│   │   ├── dashboard/      # Layout and analytics components
│   │   ├── intelligence/   # Report drafts, editor, dual-signature flows
│   │   ├── investigation/  # Case plans, findings, auto-generated reports
│   │   └── stock/          # Seizures, temporary/main stock, releases, OTP wizards
│   ├── hooks/              # Global reusable React hooks
│   ├── theme/
│   │   └── variables.css   # Main design system CSS variables
│   ├── App.jsx             # Main Application Routes (React Router v7)
│   ├── main.jsx            # Entry mount point
│   └── index.css           # Global reset stylesheet
├── package.json
└── vite.config.js
```

---

## 3. Visual Design System

The layout relies on Vanilla CSS variables defined in `/src/theme/variables.css`. Ensure new styles use these tokens rather than static HEX values:

```css
/* Color Accent Standard */
.rra-card {
  background: var(--background-panel);
  border: var(--panel-border);
  backdrop-filter: var(--glass-blur);
  border-radius: 8px;
  color: var(--text-primary);
}
```

*   **Primary Accent**: Blue is reserved for active workflows and highlights. Use `var(--primary-brand)`.
*   **Spacing Hierarchy**: Spacing scales dynamically in multiples of `4px` (`var(--spacing-xs: 4px)`, `var(--spacing-sm: 8px)`, etc.).

---

## 4. Component Philosophy & Workspace Layout

We adopt an **Inline Dual-Column Split Workspace** layout for desktop devices:
1.  **Left Column (60%)**: Renders search filters and high-density, virtualized data tables.
2.  **Right Column (40%)**: Displays selected row inspectors, documents, timelines, and action inputs (approvals, rejections, OTP triggers).

This layout minimizes page reloads and drawer fatigue. Ensure features implement the `SplitWorkspaceLayout` wrapper.

---

## 5. Development Conventions

### conventional commits
Commit messages must follow the Angular conventional guidelines to maintain clean logs:
*   `feat(stock): add owner return OTP verification wizard`
*   `fix(auth): correct token refresh interceptor crash`
*   `docs(ui): update README folder configurations`

### MSW Mock Control
MSW is enabled in development mode by default. To disable client-side mocking and route calls to a live backend, toggle the feature flag in your configuration file:
*   File: `/src/config.js` -> Set `enableMocks: false` to target the active backend port.
