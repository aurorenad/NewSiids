# SIIDS Project Gap Report

Generated on: 2026-06-10

This file summarizes what is already present in the SIIDS project, what is missing or risky, and how to fix each item. It is based on a repository scan plus these checks:

- Frontend build: `npm run build` in `Siids/siidsfrontend` passes.
- Backend tests: `./mvnw.cmd test` in `Siids/SiidsBackend` passes with 44 tests.
- Frontend lint: `npm run lint` fails with 39 errors and 32 warnings.

## Current Project Shape

The project is a full-stack SIIDS system:

- Frontend: React 18 with Vite, React Router, MUI, Bootstrap, Axios, SockJS/STOMP, PDF/export libraries.
- Backend: Spring Boot 3.5.11, Spring Security JWT, JPA/Hibernate, PostgreSQL, WebSockets, Thymeleaf/OpenHTMLtoPDF, Maven.
- Major modules already present: authentication, RBAC, cases, reports, investigation workflow, surveillance, stock/physical stock, PRSO approvals, notifications, audit/history, user administration, legal advisor, reward memo scaffolding.
- Backend test coverage exists for authorization, users, reports, cases, file storage, stock, and physical stock workflows.

## Highest Priority Fixes

### 1. Frontend lint is failing

Status: Missing cleanup required.

Why it matters: The app builds, but lint failure blocks CI/CD quality gates and hides real bugs.

Current evidence:

- `src/Components/EditReport.jsx` uses `ROUTES` but does not import it.
- `src/Components/LegalAdvisor.jsx` uses `routeTo` but does not import it.
- `src/Components/SClaimForm.jsx`, `src/Components/SetupPassword.jsx`, `src/Components/SurveillenceOffice/NewSurveillenceCase.jsx`, and `src/Components/TaxReportView.jsx` use `ROUTES` without imports.
- `src/api/Axios/caseApi.jsx` has an unused `employeeId` variable and unreachable code after `return config`.
- Many files have unused `err`, `error`, or helper variables.

How to fix:

1. Add missing imports from `src/constants/routes.js` where `ROUTES` or `routeTo` is used.
2. Remove unused variables or use them in error messages/logging.
3. Remove unreachable code in `src/api/Axios/caseApi.jsx`.
4. Re-run `npm run lint` until it passes.

Suggested first files:

- `Siids/siidsfrontend/src/api/Axios/caseApi.jsx`
- `Siids/siidsfrontend/src/Components/EditReport.jsx`
- `Siids/siidsfrontend/src/Components/LegalAdvisor.jsx`
- `Siids/siidsfrontend/src/Components/SClaimForm.jsx`
- `Siids/siidsfrontend/src/Components/SetupPassword.jsx`
- `Siids/siidsfrontend/src/Components/TaxReportView.jsx`

### 2. Production secrets and environment configuration are incomplete

Status: Partially present but unsafe for deployment.

Why it matters: `application.properties` contains local database credentials and a default JWT secret fallback exists in code. This is acceptable for local development only.

Current evidence:

- `Siids/SiidsBackend/src/main/resources/application.properties` has:
  - `spring.datasource.username=postgres`
  - `spring.datasource.password=wellcome`
  - `spring.jpa.hibernate.ddl-auto=update`
- `Siids/SiidsBackend/src/main/java/org/example/siidsbackend/Service/JWTService.java` has a default JWT secret fallback.
- `.env.example` has DB env variables, but `application.properties` does not use them.

How to fix:

1. Change datasource values to environment placeholders:
   - `spring.datasource.url=${DB_URL}`
   - `spring.datasource.username=${DB_USERNAME}`
   - `spring.datasource.password=${DB_PASSWORD}`
2. Add `JWT_SECRET` to `.env.example`.
3. Change JWT secret config to require `${JWT_SECRET}` in production.
4. Use `spring.jpa.hibernate.ddl-auto=validate` or migrations in production.
5. Add a separate `application-local.properties` for developer defaults if needed.

### 3. No database migration system

Status: Missing.

Why it matters: The backend relies on Hibernate `ddl-auto=update` plus SQL files. This can drift between developer machines and production.

How to fix:

1. Add Flyway or Liquibase.
2. Move schema changes into versioned migrations.
3. Keep seed data separate from schema migrations.
4. Use migrations for RBAC permissions and default reference data.

Recommended path: Flyway, because it is simple for SQL-first projects.

### 4. Director Intelligence report status filter is only client-side

Status: Partially implemented.

Why it matters: `DirectorIntelligenceCaseReports.jsx` filters only the currently loaded page. Pagination totals can be wrong, and reports on other pages are ignored.

Current evidence:

- Frontend file: `Siids/siidsfrontend/src/Components/DirectorIntelligenceCaseReports.jsx`
- Backend endpoint: `GET /api/reports/director-intelligence/reports`
- Backend supports `page`, `size`, `search`, and `sort`, but not `status`.

How to fix:

1. Add `status` request param to `ReportController.getReportsForDirectorIntelligence`.
2. Add a `status` parameter to `ReportService.getReportPageForDirectorIntelligence`.
3. Filter by `report.getStatus()` before pagination.
4. Send `status: statusFilter === 'all' ? undefined : statusFilter` from the frontend.
5. Add `statusFilter` to the frontend `useEffect` dependency list.

### 5. CI/CD workflow is missing

Status: Missing.

Why it matters: There is a `.github` folder, but no workflow file was found under `.github/workflows`.

How to fix:

Create `.github/workflows/ci.yml` that runs:

- Frontend: `npm ci`, `npm run lint`, `npm run build`
- Backend: `./mvnw.cmd test` on Windows or `./mvnw test` on Ubuntu

Do this after lint is fixed, otherwise CI will correctly fail.

## Medium Priority Fixes

### 6. Java version documentation does not match the backend build

Status: Inconsistent.

Current evidence:

- README says Java 21 or higher.
- `pom.xml` sets `<java.version>17</java.version>`.
- Local tests ran using Java 26.

How to fix:

Choose one supported version and document it everywhere. Spring Boot 3.5 supports modern Java, but the project should be explicit. If the target is Java 21, update `pom.xml` to `<java.version>21</java.version>` and test it.

### 7. CORS configuration is duplicated and hardcoded

Status: Works locally, but not deployment-ready.

Current evidence:

- CORS is configured in `application.properties`.
- CORS is also hardcoded in `SecurityConfig.java`.
- CORS is also hardcoded in `CorsConfig.java`.
- `192.168.0.142:8086` appears in multiple backend files.

How to fix:

1. Keep one CORS source of truth.
2. Read allowed origins from `cors.allowed-origins`.
3. Remove duplicated hardcoded origin lists from Java config.

### 8. Frontend API clients are duplicated

Status: Works, but creates maintenance risk.

Current evidence:

- `src/api/axios.jsx` creates a shared Axios instance with refresh handling.
- `src/api/Axios/caseApi.jsx` creates a second Axios instance with similar refresh handling.
- `StockManagement.jsx` has its own `BASE_URL`.

How to fix:

1. Use `src/api/axios.jsx` as the single HTTP client.
2. Move case/report API functions onto that shared client.
3. Remove duplicated refresh logic.
4. Add one config utility for API and websocket base URLs.

### 9. WebSocket logging is too noisy for production

Status: Needs cleanup.

Current evidence:

- `src/websocket.js` logs STOMP debug messages and notification payloads.

How to fix:

Wrap logs in `if (import.meta.env.DEV)` or remove them before production.

### 10. Frontend bundle is very large

Status: Build passes with warning.

Current evidence:

- Main JS chunk is about 3,255 KB minified and about 956 KB gzip.

How to fix:

1. Lazy-load role pages with `React.lazy`.
2. Split PDF/export-heavy libraries into dynamic imports.
3. Add Vite/Rollup manual chunks for MUI, PDF tools, and vendor code.

## Lower Priority Cleanup

### 11. README has encoding issues

Status: Documentation cleanup needed.

Current evidence:

- Several headings show broken characters such as `ðŸš€` instead of icons.

How to fix:

Save README as UTF-8 and replace broken symbols or remove them.

### 12. Referenced documentation file is missing

Status: Missing or stale reference.

Current evidence:

- README references `DATA_INITIALIZATION_README.md`, but that file was not found in the repository scan.

How to fix:

Either create `DATA_INITIALIZATION_README.md` or remove/update the reference in `Siids/README.md`.

### 13. Role and route spelling should be standardized

Status: Works but inconsistent.

Current evidence:

- Route/component names use `Surveillence` in several places instead of `Surveillance`.
- Role names include both `Surveillance` and route paths like `/surveillence-officer`.

How to fix:

Keep existing routes for backward compatibility, but add correctly spelled aliases and gradually rename components/files.

## Suggested Implementation Order

1. Fix frontend lint errors.
2. Add CI workflow after lint passes.
3. Move secrets and environment config out of committed `application.properties`.
4. Add backend status filtering for Director Intelligence reports.
5. Consolidate Axios/API configuration.
6. Consolidate CORS configuration.
7. Add database migrations.
8. Improve bundle splitting.
9. Clean README and missing documentation.

## Verification Commands

Run these after fixes:

```powershell
cd Siids\siidsfrontend
npm run lint
npm run build
```

```powershell
cd Siids\SiidsBackend
.\mvnw.cmd test
```

## Overall Readiness

The project is not empty or early-stage; most core business modules are already implemented. The main missing pieces are production hardening, CI, lint cleanup, migration management, and a few frontend/backend contract refinements. The safest next move is to fix lint first, because that will make every later change easier to verify.
