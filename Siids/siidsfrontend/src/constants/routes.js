export const ROUTES = {
  ASSISTANT_COMMISSIONER: '/assistant-commissioner',
  ASSISTANT_COMMISSIONER_FINES_REPORT: '/assistant-commissioner/fines-report',
  ASSISTANT_COMMISSIONER_PENALTIES_REPORT: '/assistant-commissioner/penalties-report',
  DIRECTOR_INTELLIGENCE: '/director-intelligence',
  DIRECTOR_INTELLIGENCE_CASE_REPORTS: '/director-intelligence/case-reports',
  DIRECTOR_INVESTIGATION: '/director-investigation',
  FORGOT_PASSWORD: '/forgot-password',
  HISTORY: '/history',
  HOME: '/home',
  INTELLIGENCE_OFFICER: '/intelligence-officer',
  INTELLIGENCE_OFFICER_CLAIM_FORM: '/intelligence-officer/claim-form/:caseNum',
  INTELLIGENCE_OFFICER_EDIT_REPORT: '/intelligence-officer/edit-report/:reportId',
  INTELLIGENCE_OFFICER_NEW_CASE: '/intelligence-officer/newCase',
  INTELLIGENCE_OFFICER_VIEW_CASE: '/intelligence-officer/view-case/*',
  INVESTIGATION_OFFICER: '/investigation-officer',
  LEGACY_DIRECTOR_INVESTIGATION: '/Director-Investigation',
  LEGACY_SURVEILLANCE_NEW: '/surveillence-officer/New',
  LEGAL_ADVISOR: '/legal-advisor',
  LOGIN: '/',
  PRSO_APPROVALS: '/prso/approvals',
  REPORT_DETAILS: '/view-report/:id',
  REPORT_FINDINGS: '/reports/:id/findings',
  REPORT_VIEW: '/reports/:id',
  STOCK_INVENTORY: '/stock/inventory',
  STOCK_MANAGEMENT: '/stock-management',
  SURVEILLANCE: '/surveillence-officer',
  SURVEILLANCE_EDIT_CASE: '/surveillence-officer/edit-case',
  SURVEILLANCE_NEW: '/surveillence-officer/new',
  SURVEILLANCE_RELEASES: '/surveillence-officer/releases',
  SURVEILLANCE_REPORT_FORM: '/surveillence-officer/sclaim-form/:caseNum',
  SURVEILLANCE_VIEW_CASE: '/surveillence-officer/view/*',
  SYSTEM_ADMIN: '/system-admin',
  T3_OFFICERS_REPORTS: '/reports/t3-officers',
  TEMPORARY_STOCK: '/pv/temporary-stock',
  SETUP_PASSWORD: '/setup-password',
};

const buildRoute = (route, params = {}) =>
  Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value ?? '')),
    route,
  );

export const routeTo = {
  intelligenceOfficerClaimForm: (caseNum) =>
    buildRoute(ROUTES.INTELLIGENCE_OFFICER_CLAIM_FORM, { caseNum }),
  intelligenceOfficerEditReport: (reportId) =>
    buildRoute(ROUTES.INTELLIGENCE_OFFICER_EDIT_REPORT, { reportId }),
  reportDetails: (id) => buildRoute(ROUTES.REPORT_DETAILS, { id }),
  reportFindings: (id) => buildRoute(ROUTES.REPORT_FINDINGS, { id }),
  surveillanceViewCase: (caseNum) =>
    ROUTES.SURVEILLANCE_VIEW_CASE.replace('*', encodeURIComponent(caseNum ?? '')),
};
