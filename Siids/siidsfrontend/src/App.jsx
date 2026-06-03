import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Home from './Components/Home.jsx';
import Login from './Components/Login';
import Sidebar from './Components/SideNav.jsx';
import Header from './Components/Header';
import DirectorIntelligence from './Components/DirectorIntelligence';
import IntelligenceOfficer from './Components/IntelligenceOfficer';
import InvestigationOfficer from "./Components/InvestigationOfficer";
import DirectorInvestigation from "./Components/DirectorInvestigation";
import AssistantCommissioner from './Components/AssistantCommissioner';
import SurveillenceOfficer from "./Components/SurveillenceOffice/SurveillenceOfficer.jsx";
import NewSurveillenceCase from "./Components/SurveillenceOffice/NewSurveillenceCase.jsx";
import TaxReportView from "./Components/TaxReportView.jsx";
import History from './Components/History';
import NewCase from './Components/TaxReportForm.jsx';
import './App.css';
import { ClaimForm as ClaimForm } from "./Components/ClaimForm.jsx";
import { SClaimForm as SClaimForm } from "./Components/SClaimForm.jsx";
import SurveillanceCaseView from "./Components/SurveillenceOffice/SurveillanceCaseView.jsx";
import ReportView from "./Components/ReportView.jsx";
import FindingsViewerPage from "./Components/FindingsViewerPage.jsx";
import ViewReportDetails from "./Components/ViewReportDetails.jsx";
import FinesReport from "./Components/FinesReport.jsx";
import DirectorIntelligenceCaseReports from "./Components/DirectorIntelligenceCaseReports.jsx";
import T3OfficersReports from "./Components/T3OfficersReports.jsx";
import ForgotPassword from "./Components/ForgotPassword.jsx";
import SetupPassword from "./Components/SetupPassword.jsx";
import LegalAdvisor from "./Components/LegalAdvisor.jsx"
import EditReport from "./Components/EditReport.jsx";
import StockManagement from "./Components/StockManagement.jsx";
import SystemAdmin from "./Components/SystemAdmin.jsx";
import PrsoReleases from "./Components/PrsoReleases.jsx";
import { Box } from '@mui/material';
import { Toaster } from 'sonner';
import { hasAnyPermission } from './utils/authorization';
import { PERMISSIONS } from './constants/permissions';
import { ROUTES } from './constants/routes';

// --- NEW PHYSICAL STOCK MODULE IMPORTS ---
import PVTemporaryStockPage from "./Pages/Stock/PVTemporaryStockPage.jsx";
import StockManagerPage from "./Pages/Stock/StockManagerPage.jsx";
import PRSOApprovalsPage from "./Pages/Stock/PRSOApprovalsPage.jsx";

const AppShell = ({ children }) => (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Sidebar />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Header />
            <Box sx={{ flex: 1, p: 2.5, overflow: 'auto' }}>{children}</Box>
        </Box>
    </Box>
);

const ProtectedRoute = ({ children, permissions }) => {
    const { authState, loading } = useContext(AuthContext);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!authState?.token || !authState?.employeeId) {
        console.log("ProtectedRoute: Missing token or employeeId, redirecting to login");
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    if (permissions?.length) {
        if (!hasAnyPermission(authState, permissions)) {
            console.warn(`ProtectedRoute: Access denied. Required permissions [${permissions.join(', ')}]. Redirecting to /home`);
            return <Navigate to={ROUTES.HOME} replace />;
        }
    }

    return <AppShell>{children}</AppShell>;
};

const withProtected = (element, permissions) => (
    <ProtectedRoute permissions={permissions}>{element}</ProtectedRoute>
);

const publicRoutes = [
    { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPassword /> },
    { path: ROUTES.SETUP_PASSWORD, element: <SetupPassword /> },
    { path: ROUTES.LOGIN, element: <Login /> },
];

const protectedRoutes = [
    { path: ROUTES.HOME, element: <Home /> },
    { path: ROUTES.DIRECTOR_INTELLIGENCE, element: <DirectorIntelligence />, permissions: [PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_APPROVE_INTELLIGENCE] },
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
    { path: ROUTES.DIRECTOR_INVESTIGATION, element: <DirectorInvestigation />, permissions: [PERMISSIONS.REPORT_APPROVE_INVESTIGATION, PERMISSIONS.REPORT_ASSIGN_INVESTIGATION] },
    { path: ROUTES.LEGACY_DIRECTOR_INVESTIGATION, element: <Navigate to={ROUTES.DIRECTOR_INVESTIGATION} replace />, permissions: [PERMISSIONS.REPORT_APPROVE_INVESTIGATION, PERMISSIONS.REPORT_ASSIGN_INVESTIGATION] },
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
    { path: ROUTES.SURVEILLANCE_RELEASES, element: <PrsoReleases />, permissions: [PERMISSIONS.STOCK_APPROVE_RELEASE] },
    // --- NEW PHYSICAL STOCK MODULE ROUTES ---
    { path: ROUTES.TEMPORARY_STOCK, element: <PVTemporaryStockPage />, permissions: [PERMISSIONS.STOCK_VIEW, PERMISSIONS.SURVEILLANCE_VIEW] },
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
                    element={withProtected(route.element, route.permissions)}
                />
            ))}
            <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
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
                    <AppRoutes />
                </NotificationWrapper>
            </AuthProvider>
        </Router>
    );
}

export default App;
