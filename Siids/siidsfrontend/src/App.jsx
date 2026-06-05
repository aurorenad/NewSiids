import React, { useContext, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { Toaster } from 'sonner';
import './App.css';

// Eagerly load core layout components
import Sidebar from './Components/SideNav.jsx';
import Header from './Components/Header';

// Lazy load route components
const Home = lazy(() => import('./Components/Home.jsx'));
const Login = lazy(() => import('./Components/Login'));
const DirectorIntelligence = lazy(() => import('./Components/DirectorIntelligence'));
const IntelligenceOfficer = lazy(() => import('./Components/IntelligenceOfficer'));
const InvestigationOfficer = lazy(() => import("./Components/InvestigationOfficer"));
const DirectorInvestigation = lazy(() => import("./Components/DirectorInvestigation"));
const AssistantCommissioner = lazy(() => import('./Components/AssistantCommissioner'));
const SurveillenceOfficer = lazy(() => import("./Components/SurveillenceOffice/SurveillenceOfficer.jsx"));
const NewSurveillenceCase = lazy(() => import("./Components/SurveillenceOffice/NewSurveillenceCase.jsx"));
const TaxReportView = lazy(() => import("./Components/TaxReportView.jsx"));
const History = lazy(() => import('./Components/History'));
const NewCase = lazy(() => import('./Components/TaxReportForm.jsx'));
const Register = lazy(() => import('./Components/Register'));
const ClaimForm = lazy(() => import("./Components/ClaimForm.jsx").then(module => ({ default: module.ClaimForm })));
const SClaimForm = lazy(() => import("./Components/SClaimForm.jsx").then(module => ({ default: module.SClaimForm })));
const SurveillanceCaseView = lazy(() => import("./Components/SurveillenceOffice/SurveillanceCaseView.jsx"));
const ReportView = lazy(() => import("./Components/ReportView.jsx"));
const FindingsViewerPage = lazy(() => import("./Components/FindingsViewerPage.jsx"));
const ViewReportDetails = lazy(() => import("./Components/ViewReportDetails.jsx"));
const FinesReport = lazy(() => import("./Components/FinesReport.jsx"));
const DirectorIntelligenceCaseReports = lazy(() => import("./Components/DirectorIntelligenceCaseReports.jsx"));
const T3OfficersReports = lazy(() => import("./Components/T3OfficersReports.jsx"));
const ForgotPassword = lazy(() => import("./Components/ForgotPassword.jsx"));
const LegalAdvisor = lazy(() => import("./Components/LegalAdvisor.jsx"));
const EditReport = lazy(() => import("./Components/EditReport.jsx"));
const DirectorEditReport = lazy(() => import("./Components/DirectorEditReport.jsx"));
const StockManagement = lazy(() => import("./Components/StockManagement.jsx"));
const SystemAdmin = lazy(() => import("./Components/SystemAdmin.jsx"));
const PrsoReleases = lazy(() => import("./Components/PrsoReleases.jsx"));

// Lazy load Stock Module components
const PVTemporaryStockPage = lazy(() => import("./Pages/Stock/PVTemporaryStockPage.jsx"));
const StockManagerPage = lazy(() => import("./Pages/Stock/StockManagerPage.jsx"));
const PRSOApprovalsPage = lazy(() => import("./Pages/Stock/PRSOApprovalsPage.jsx"));
const DeputyPrsoDashboard = lazy(() => import("./Pages/Stock/DeputyPrsoDashboard.jsx"));
const SurveillanceReportsPage = lazy(() => import("./Pages/Stock/SurveillanceReportsPage.jsx"));

const LoadingScreen = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
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

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { authState, loading } = useContext(AuthContext);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!authState?.token || !authState?.employeeId) {
        console.log("ProtectedRoute: Missing token or employeeId, redirecting to login");
        return <Navigate to="/" replace />;
    }

    if (allowedRoles) {
        const userRole = (authState?.role || '').toString().toUpperCase().replace('ROLE_', '').trim();
        const allowedUpper = allowedRoles.map(r => (r || '').toString().toUpperCase().replace('ROLE_', '').trim());
        
        console.log(`ProtectedRoute: User role [${userRole}], Allowed roles [${allowedUpper}]`);
        
        const hasAccess = allowedUpper.some(allowed => 
            userRole === allowed || userRole.includes(allowed) || allowed.includes(userRole)
        );

        if (!hasAccess) {
            console.warn(`ProtectedRoute: Access denied for role [${userRole}]. Redirecting to /home`);
            return <Navigate to="/home" replace />;
        }
    }

    return <AppShell>{children}</AppShell>;
};

const withProtected = (element, allowedRoles) => (
    <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
);

const publicRoutes = [
    { path: "/register", element: <Register /> },
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/", element: <Login /> },
];

const protectedRoutes = [
    { path: "/home", element: <Home /> },
    { path: "/director-intelligence", element: <DirectorIntelligence />, roles: ['DirectorIntelligence'] },
    { path: "/intelligence-officer", element: <IntelligenceOfficer />, roles: ['User', 'IntelligenceOfficer'] },
    { path: "/intelligence-officer/newCase", element: <NewCase />, roles: ['User', 'IntelligenceOfficer'] },
    { path: "/intelligence-officer/view-case/*", element: <TaxReportView />, roles: ['User', 'IntelligenceOfficer'] },
    { path: "/intelligence-officer/claim-form/:caseNum", element: <ClaimForm />, roles: ['User', 'IntelligenceOfficer'] },
    { path: "/investigation-officer", element: <InvestigationOfficer />, roles: ['InvestigationOfficer'] },
    { path: "/surveillence-officer", element: <SurveillenceOfficer />, roles: ['Surveillance'] },
    { path: "/surveillence-officer/New", element: <NewSurveillenceCase />, roles: ['Surveillance'] },
    { path: "/surveillence-officer/edit-case", element: <NewSurveillenceCase />, roles: ['Surveillance'] },
    { path: "/surveillence-officer/view/*", element: <SurveillanceCaseView />, roles: ['Surveillance'] },
    { path: "/surveillence-officer/sclaim-form/:caseNum", element: <SClaimForm />, roles: ['Surveillance'] },
    { path: "/Director-Investigation", element: <DirectorInvestigation />, roles: ['DirectorInvestigation'] },
    { path: "/assistant-commissioner", element: <AssistantCommissioner />, roles: ['AssistantCommissioner'] },
    { path: "/history", element: <History />, roles: ['ROLE_AUDITOR'] },
    {
        path: "/reports/:id",
        element: <ReportView />,
        roles: ['User', 'IntelligenceOfficer', 'DirectorIntelligence', 'DirectorInvestigation', 'InvestigationOfficer', 'AssistantCommissioner', 'legalAdvisor'],
    },
    {
        path: "/reports/:id/findings",
        element: <FindingsViewerPage />,
        roles: ['User', 'IntelligenceOfficer', 'DirectorIntelligence', 'DirectorInvestigation', 'InvestigationOfficer', 'AssistantCommissioner', 'legalAdvisor'],
    },
    {
        path: "/view-report/:id",
        element: <ViewReportDetails />,
        roles: ['User', 'IntelligenceOfficer', 'DirectorIntelligence', 'DirectorInvestigation', 'InvestigationOfficer', 'AssistantCommissioner', 'legalAdvisor'],
    },
    { path: "/assistant-commissioner/fines-report", element: <FinesReport />, roles: ['AssistantCommissioner'] },
    { path: "/assistant-commissioner/penalties-report", element: <FinesReport />, roles: ['AssistantCommissioner'] },
    { path: "/director-intelligence/case-reports", element: <DirectorIntelligenceCaseReports />, roles: ['DirectorIntelligence'] },
    { path: "/reports/t3-officers", element: <T3OfficersReports />, roles: ['DirectorIntelligence'] },
    { path: "/legal-advisor", element: <LegalAdvisor />, roles: ['legalAdvisor'] },
    { path: "/intelligence-officer/edit-report/:reportId", element: <EditReport /> },
    { path: "/director-intelligence/edit-report/:reportId", element: <DirectorEditReport /> },
    { path: "/stock-management", element: <StockManagement />, roles: ['StockManager'] },
    { path: "/system-admin", element: <SystemAdmin />, roles: ['Admin', 'admin'] },
    { path: "/surveillence-officer/releases", element: <PrsoReleases />, roles: ['Surveillance', 'PRSO'] },
    // --- NEW PHYSICAL STOCK MODULE ROUTES ---
    { path: "/pv/temporary-stock", element: <PVTemporaryStockPage />, roles: ['Surveillance', 'SURVEILLANCE_OFFICER'] },
    { path: "/pv/reports", element: <SurveillanceReportsPage />, roles: ['Surveillance', 'SURVEILLANCE_OFFICER'] },
    { path: "/stock/inventory", element: <StockManagerPage />, roles: ['StockManager', 'STOCK_MANAGER'] },
    { path: "/prso/approvals", element: <PRSOApprovalsPage />, roles: ['PRSO'] },
    { path: "/prso/deputy-approvals", element: <DeputyPrsoDashboard />, roles: ['DEPUTY_PRSO', 'Deputy_PRSO'] },
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
                    element={withProtected(route.element, route.roles)}
                />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes >
    );
};

import { NotificationProvider } from './NotificationComponents/NotificationContext';

const NotificationWrapper = ({ children }) => {
    const { authState, loading } = useContext(AuthContext);
    
    // Don't render notification provider until auth state is loaded
    if (loading) return children;
    
    return (
        <NotificationProvider employeeId={authState?.employeeId}>
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
                    <Suspense fallback={<LoadingScreen />}>
                        <AppRoutes />
                    </Suspense>
                </NotificationWrapper>
            </AuthProvider>
        </Router>
    );
}

export default App;