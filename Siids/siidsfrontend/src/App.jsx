import React, { lazy, Suspense, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './Components/SideNav.jsx';
import Header from './Components/Header';
import './App.css';
import { Box, CircularProgress } from '@mui/material';
import { Toaster } from 'sonner';
import { hasAllPermissions, hasAnyPermission } from './utils/authorization';
import { PERMISSIONS } from './constants/permissions';
import { ROUTES } from './constants/routes';

const Home = lazy(() => import('./Components/Home.jsx'));
const Login = lazy(() => import('./Components/Login'));
const DirectorIntelligence = lazy(() => import('./Components/DirectorIntelligence'));
const IntelligenceOfficer = lazy(() => import('./Components/IntelligenceOfficer'));
const InvestigationOfficer = lazy(() => import('./Components/InvestigationOfficer'));
const DirectorInvestigation = lazy(() => import('./Components/DirectorInvestigation'));
const AssistantCommissioner = lazy(() => import('./Components/AssistantCommissioner'));
const SurveillenceOfficer = lazy(() => import('./Components/SurveillenceOffice/SurveillenceOfficer.jsx'));
const NewSurveillenceCase = lazy(() => import('./Components/SurveillenceOffice/NewSurveillenceCase.jsx'));
const TaxReportView = lazy(() => import('./Components/TaxReportView.jsx'));
const History = lazy(() => import('./Components/History'));
const NewCase = lazy(() => import('./Components/TaxReportForm.jsx'));
const ClaimForm = lazy(() => import('./Components/ClaimForm.jsx').then((module) => ({ default: module.ClaimForm })));
const SClaimForm = lazy(() => import('./Components/SClaimForm.jsx').then((module) => ({ default: module.SClaimForm })));
const SurveillanceCaseView = lazy(() => import('./Components/SurveillenceOffice/SurveillanceCaseView.jsx'));
const ReportView = lazy(() => import('./Components/ReportView.jsx'));
const FindingsViewerPage = lazy(() => import('./Components/FindingsViewerPage.jsx'));
const ViewReportDetails = lazy(() => import('./Components/ViewReportDetails.jsx'));
const FinesReport = lazy(() => import('./Components/FinesReport.jsx'));
const DirectorIntelligenceCaseReports = lazy(() => import('./Components/DirectorIntelligenceCaseReports.jsx'));
const T3OfficersReports = lazy(() => import('./Components/T3OfficersReports.jsx'));
const ForgotPassword = lazy(() => import('./Components/ForgotPassword.jsx'));
const SetupPassword = lazy(() => import('./Components/SetupPassword.jsx'));
const LegalAdvisor = lazy(() => import('./Components/LegalAdvisor.jsx'));
const EditReport = lazy(() => import('./Components/EditReport.jsx'));
const StockManagement = lazy(() => import('./Components/StockManagement.jsx'));
const SystemAdmin = lazy(() => import('./Components/SystemAdmin.jsx'));
const PVTemporaryStockPage = lazy(() => import('./Pages/Stock/PVTemporaryStockPage.jsx'));
const StockManagerPage = lazy(() => import('./Pages/Stock/StockManagerPage.jsx'));
const PRSOApprovalsPage = lazy(() => import('./Pages/Stock/PRSOApprovalsPage.jsx'));

const RouteLoadingScreen = () => (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress aria-label="Loading page" />
    </Box>
);

const AppShell = ({ children }) => (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Sidebar />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Header />
            <Box sx={{ flex: 1, p: 2.5, overflow: 'auto' }}>{children}</Box>
        </Box>
    </Box>
);

const ProtectedRoute = ({ children, permissions, requireAllPermissions = false }) => {
    const { authState, loading } = useContext(AuthContext);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!authState?.token || !authState?.employeeId) {
        console.log("ProtectedRoute: Missing token or employeeId, redirecting to login");
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    if (permissions?.length) {
        const hasAccess = requireAllPermissions
            ? hasAllPermissions(authState, permissions)
            : hasAnyPermission(authState, permissions);
        if (!hasAccess) {
            console.warn(`ProtectedRoute: Access denied. Required permissions [${permissions.join(', ')}]. Redirecting to /home`);
            return <Navigate to={ROUTES.HOME} replace />;
        }
    }

    return <AppShell>{children}</AppShell>;
};

const withProtected = (element, permissions, requireAllPermissions) => (
    <ProtectedRoute permissions={permissions} requireAllPermissions={requireAllPermissions}>{element}</ProtectedRoute>
);

const publicRoutes = [
    { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPassword /> },
    { path: ROUTES.SETUP_PASSWORD, element: <SetupPassword /> },
    { path: ROUTES.LOGIN, element: <Login /> },
];

const protectedRoutes = [
    { path: ROUTES.HOME, element: <Home /> },
    { path: ROUTES.DIRECTOR_INTELLIGENCE, element: <DirectorIntelligence />, permissions: [PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_APPROVE_INTELLIGENCE], requireAllPermissions: true },
    { path: ROUTES.INTELLIGENCE_OFFICER, element: <IntelligenceOfficer />, permissions: [PERMISSIONS.REPORT_CREATE, PERMISSIONS.REPORT_VIEW] },
    { path: ROUTES.INTELLIGENCE_OFFICER_NEW_CASE, element: <NewCase />, permissions: [PERMISSIONS.CASE_CREATE] },
    { path: ROUTES.INTELLIGENCE_OFFICER_VIEW_CASE, element: <TaxReportView />, permissions: [PERMISSIONS.CASE_VIEW] },
    { path: ROUTES.INTELLIGENCE_OFFICER_CLAIM_FORM, element: <ClaimForm />, permissions: [PERMISSIONS.REPORT_CREATE] },
    { path: ROUTES.INVESTIGATION_OFFICER, element: <InvestigationOfficer />, permissions: [PERMISSIONS.REPORT_CREATE, PERMISSIONS.REPORT_VIEW] },
    { path: ROUTES.SURVEILLANCE, element: <SurveillenceOfficer />, permissions: [PERMISSIONS.SURVEILLANCE_VIEW] },
    { path: ROUTES.SURVEILLANCE_NEW, element: <NewSurveillenceCase />, permissions: [PERMISSIONS.SURVEILLANCE_CREATE] },
    { path: ROUTES.LEGACY_SURVEILLANCE_NEW, element: <Navigate to={ROUTES.SURVEILLANCE_NEW} replace />, permissions: [PERMISSIONS.SURVEILLANCE_CREATE] },
    { path: ROUTES.SURVEILLANCE_EDIT_CASE, element: <NewSurveillenceCase />, permissions: [PERMISSIONS.SURVEILLANCE_CREATE] },
    { path: ROUTES.SURVEILLANCE_VIEW_CASE, element: <SurveillanceCaseView />, permissions: [PERMISSIONS.SURVEILLANCE_VIEW] },
    { path: ROUTES.SURVEILLANCE_REPORT_FORM, element: <SClaimForm />, permissions: [PERMISSIONS.SURVEILLANCE_CREATE] },
    { path: ROUTES.DIRECTOR_INVESTIGATION, element: <DirectorInvestigation />, permissions: [PERMISSIONS.REPORT_APPROVE_INVESTIGATION, PERMISSIONS.REPORT_ASSIGN_INVESTIGATION], requireAllPermissions: true },
    { path: ROUTES.LEGACY_DIRECTOR_INVESTIGATION, element: <Navigate to={ROUTES.DIRECTOR_INVESTIGATION} replace />, permissions: [PERMISSIONS.REPORT_APPROVE_INVESTIGATION, PERMISSIONS.REPORT_ASSIGN_INVESTIGATION], requireAllPermissions: true },
    { path: ROUTES.ASSISTANT_COMMISSIONER, element: <AssistantCommissioner />, permissions: [PERMISSIONS.REPORT_APPROVE_ASSISTANT_COMMISSIONER] },
    { path: ROUTES.HISTORY, element: <History />, permissions: [PERMISSIONS.AUDIT_VIEW] },
    {
        path: ROUTES.REPORT_VIEW,
        element: <ReportView />,
        permissions: [PERMISSIONS.REPORT_VIEW],
    },
    {
        path: ROUTES.REPORT_FINDINGS,
        element: <FindingsViewerPage />,
        permissions: [PERMISSIONS.REPORT_VIEW],
    },
    {
        path: ROUTES.REPORT_DETAILS,
        element: <ViewReportDetails />,
        permissions: [PERMISSIONS.REPORT_VIEW],
    },
    { path: ROUTES.ASSISTANT_COMMISSIONER_FINES_REPORT, element: <FinesReport />, permissions: [PERMISSIONS.REPORT_APPROVE_ASSISTANT_COMMISSIONER] },
    { path: ROUTES.ASSISTANT_COMMISSIONER_PENALTIES_REPORT, element: <FinesReport />, permissions: [PERMISSIONS.REPORT_APPROVE_ASSISTANT_COMMISSIONER] },
    { path: ROUTES.DIRECTOR_INTELLIGENCE_CASE_REPORTS, element: <DirectorIntelligenceCaseReports />, permissions: [PERMISSIONS.REPORT_VIEW] },
    { path: ROUTES.T3_OFFICERS_REPORTS, element: <T3OfficersReports />, permissions: [PERMISSIONS.REPORT_ASSIGN_INVESTIGATION] },
    { path: ROUTES.LEGAL_ADVISOR, element: <LegalAdvisor />, permissions: [PERMISSIONS.LEGAL_REVIEW] },
    { path: ROUTES.INTELLIGENCE_OFFICER_EDIT_REPORT, element: <EditReport />, permissions: [PERMISSIONS.REPORT_CREATE] },
    { path: ROUTES.STOCK_MANAGEMENT, element: <StockManagement />, permissions: [PERMISSIONS.STOCK_MANAGE] },
    { path: ROUTES.SYSTEM_ADMIN, element: <SystemAdmin />, permissions: [PERMISSIONS.USER_VIEW] },
    { path: ROUTES.SURVEILLANCE_RELEASES, element: <Navigate to={ROUTES.PRSO_APPROVALS} replace />, permissions: [PERMISSIONS.STOCK_APPROVE_RELEASE] },
    // --- NEW PHYSICAL STOCK MODULE ROUTES ---
    { path: ROUTES.TEMPORARY_STOCK, element: <PVTemporaryStockPage />, permissions: [PERMISSIONS.STOCK_VIEW] },
    { path: ROUTES.STOCK_INVENTORY, element: <StockManagerPage />, permissions: [PERMISSIONS.STOCK_VIEW] },
    { path: ROUTES.PRSO_APPROVALS, element: <PRSOApprovalsPage />, permissions: [PERMISSIONS.STOCK_APPROVE_RELEASE] },
];

const AppRoutes = () => {
    return (
        <Routes>
            {publicRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
            ))}
            {protectedRoutes.map((route) => (
                <Route
                    key={route.path}
                    path={route.path}
                    element={withProtected(route.element, route.permissions, route.requireAllPermissions)}
                />
            ))}
            <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes >
    );
};

import { NotificationProvider } from './NotificationComponents/NotificationContext';

const NotificationWrapper = ({ children }) => {
    const { authState, loading } = useContext(AuthContext);
    const employeeId = authState?.employeeId
        || authState?.userId
        || localStorage.getItem('employeeId')
        || sessionStorage.getItem('employeeId');
    
    // Don't render notification provider until auth state is loaded
    if (loading) return children;
    
    return (
        <NotificationProvider employeeId={employeeId}>
            {children}
        </NotificationProvider>
    );
};

function App() {
    return (
        <Router>
            <Toaster position="top-right" expand={false} richColors />
            <AuthProvider>
                <NotificationWrapper>
                    <Suspense fallback={<RouteLoadingScreen />}>
                        <AppRoutes />
                    </Suspense>
                </NotificationWrapper>
            </AuthProvider>
        </Router>
    );
}

export default App;
