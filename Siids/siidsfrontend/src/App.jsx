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
import Register from './Components/Register';
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
import LegalAdvisor from "./Components/LegalAdvisor.jsx"
import EditReport from "./Components/EditReport.jsx";
import DirectorEditReport from "./Components/DirectorEditReport.jsx";
import StockManagement from "./Components/StockManagement.jsx";
import SystemAdmin from "./Components/SystemAdmin.jsx";
import PrsoReleases from "./Components/PrsoReleases.jsx";
import { Box } from '@mui/material';
import { Toaster } from 'sonner';

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
    { path: "/stock/inventory", element: <StockManagerPage />, roles: ['StockManager', 'STOCK_MANAGER'] },
    { path: "/prso/approvals", element: <PRSOApprovalsPage />, roles: ['PRSO'] },
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
                    <AppRoutes />
                </NotificationWrapper>
            </AuthProvider>
        </Router>
    );
}

export default App;