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
        return <Navigate to="/" replace />;
    }

    if (permissions?.length) {
        if (!hasAnyPermission(authState, permissions)) {
            console.warn(`ProtectedRoute: Access denied. Required permissions [${permissions.join(', ')}]. Redirecting to /home`);
            return <Navigate to="/home" replace />;
        }
    }

    return <AppShell>{children}</AppShell>;
};

const withProtected = (element, permissions) => (
    <ProtectedRoute permissions={permissions}>{element}</ProtectedRoute>
);

const publicRoutes = [
    { path: "/forgot-password", element: <ForgotPassword /> },
    { path: "/setup-password", element: <SetupPassword /> },
    { path: "/", element: <Login /> },
];

const protectedRoutes = [
    { path: "/home", element: <Home /> },
    { path: "/director-intelligence", element: <DirectorIntelligence />, permissions: ['REPORT_VIEW', 'REPORT_APPROVE_INTELLIGENCE'] },
    { path: "/intelligence-officer", element: <IntelligenceOfficer />, permissions: ['REPORT_CREATE', 'REPORT_VIEW'] },
    { path: "/intelligence-officer/newCase", element: <NewCase />, permissions: ['REPORT_CREATE'] },
    { path: "/intelligence-officer/view-case/*", element: <TaxReportView />, permissions: ['REPORT_VIEW'] },
    { path: "/intelligence-officer/claim-form/:caseNum", element: <ClaimForm />, permissions: ['REPORT_CREATE'] },
    { path: "/investigation-officer", element: <InvestigationOfficer />, permissions: ['REPORT_CREATE', 'REPORT_VIEW'] },
    { path: "/surveillence-officer", element: <SurveillenceOfficer />, permissions: ['SURVEILLANCE_VIEW'] },
    { path: "/surveillence-officer/New", element: <NewSurveillenceCase />, permissions: ['SURVEILLANCE_CREATE'] },
    { path: "/surveillence-officer/edit-case", element: <NewSurveillenceCase />, permissions: ['SURVEILLANCE_CREATE'] },
    { path: "/surveillence-officer/view/*", element: <SurveillanceCaseView />, permissions: ['SURVEILLANCE_VIEW'] },
    { path: "/surveillence-officer/sclaim-form/:caseNum", element: <SClaimForm />, permissions: ['SURVEILLANCE_CREATE'] },
    { path: "/Director-Investigation", element: <DirectorInvestigation />, permissions: ['REPORT_APPROVE_INVESTIGATION', 'REPORT_ASSIGN_INVESTIGATION'] },
    { path: "/assistant-commissioner", element: <AssistantCommissioner />, permissions: ['REPORT_APPROVE_ASSISTANT_COMMISSIONER'] },
    { path: "/history", element: <History />, permissions: ['AUDIT_VIEW'] },
    {
        path: "/reports/:id",
        element: <ReportView />,
        permissions: ['REPORT_VIEW'],
    },
    {
        path: "/reports/:id/findings",
        element: <FindingsViewerPage />,
        permissions: ['REPORT_VIEW'],
    },
    {
        path: "/view-report/:id",
        element: <ViewReportDetails />,
        permissions: ['REPORT_VIEW'],
    },
    { path: "/assistant-commissioner/fines-report", element: <FinesReport />, permissions: ['REPORT_APPROVE_ASSISTANT_COMMISSIONER'] },
    { path: "/assistant-commissioner/penalties-report", element: <FinesReport />, permissions: ['REPORT_APPROVE_ASSISTANT_COMMISSIONER'] },
    { path: "/director-intelligence/case-reports", element: <DirectorIntelligenceCaseReports />, permissions: ['REPORT_VIEW'] },
    { path: "/reports/t3-officers", element: <T3OfficersReports />, permissions: ['REPORT_ASSIGN_INVESTIGATION'] },
    { path: "/legal-advisor", element: <LegalAdvisor />, permissions: ['LEGAL_REVIEW'] },
    { path: "/intelligence-officer/edit-report/:reportId", element: <EditReport />, permissions: ['REPORT_CREATE'] },
    { path: "/stock-management", element: <StockManagement />, permissions: ['STOCK_MANAGE'] },
    { path: "/system-admin", element: <SystemAdmin />, permissions: ['USER_VIEW'] },
    { path: "/surveillence-officer/releases", element: <PrsoReleases />, permissions: ['STOCK_APPROVE_RELEASE'] },
    // --- NEW PHYSICAL STOCK MODULE ROUTES ---
    { path: "/pv/temporary-stock", element: <PVTemporaryStockPage />, permissions: ['STOCK_VIEW', 'SURVEILLANCE_VIEW'] },
    { path: "/stock/inventory", element: <StockManagerPage />, permissions: ['STOCK_VIEW'] },
    { path: "/prso/approvals", element: <PRSOApprovalsPage />, permissions: ['STOCK_APPROVE_RELEASE'] },
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
                    <AppRoutes />
                </NotificationWrapper>
            </AuthProvider>
        </Router>
    );
}

export default App;
