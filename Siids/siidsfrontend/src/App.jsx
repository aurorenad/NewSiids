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
import StockManagement from "./Components/StockManagement.jsx";
import SystemAdmin from "./Components/SystemAdmin.jsx";
import PrsoReleases from "./Components/PrsoReleases.jsx";

const ProtectedRoute = ({ children }) => {
    const { authState, loading } = useContext(AuthContext);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!authState?.token || !authState?.employeeId) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <Header />
                {children}
            </div>
        </div>
    );
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
    const { authState, loading } = useContext(AuthContext);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!authState?.token || !authState?.employeeId) {
        return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(authState?.role)) {
        return <Navigate to="/home" replace />;
    }

    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <Header />
                {children}
            </div>
        </div>
    );
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Login />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/director-intelligence" element={<RoleProtectedRoute allowedRoles={['DirectorIntelligence', 'Admin', 'admin']}><DirectorIntelligence /></RoleProtectedRoute>} />
            <Route path="/intelligence-officer" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'Admin', 'admin']}><IntelligenceOfficer /></RoleProtectedRoute>} />
            <Route path="/intelligence-officer/newCase" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'Admin', 'admin']}><NewCase /></RoleProtectedRoute>} />
            <Route path="/intelligence-officer/view-case/*" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'Admin', 'admin']}><TaxReportView /></RoleProtectedRoute>} />
            <Route path="/intelligence-officer/claim-form/:caseNum" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'Admin', 'admin']}><ClaimForm /></RoleProtectedRoute>} />
            <Route path="/investigation-officer" element={<RoleProtectedRoute allowedRoles={['InvestigationOfficer', 'Admin', 'admin']}><InvestigationOfficer /></RoleProtectedRoute>} />
            <Route path="/surveillence-officer" element={<RoleProtectedRoute allowedRoles={['Surveillance', 'Admin', 'admin']}><SurveillenceOfficer /></RoleProtectedRoute>} />
            <Route path="/surveillence-officer/New" element={<RoleProtectedRoute allowedRoles={['Surveillance', 'Admin', 'admin']}><NewSurveillenceCase /></RoleProtectedRoute>} />
            <Route path="/surveillence-officer/view/*" element={<RoleProtectedRoute allowedRoles={['Surveillance', 'Admin', 'admin']}><SurveillanceCaseView /></RoleProtectedRoute>} />
            <Route path="/surveillence-officer/sclaim-form/:caseNum" element={<RoleProtectedRoute allowedRoles={['Surveillance', 'Admin', 'admin']}><SClaimForm /></RoleProtectedRoute>} />
            <Route path="/Director-Investigation" element={<RoleProtectedRoute allowedRoles={['DirectorInvestigation', 'Admin', 'admin']}><DirectorInvestigation /></RoleProtectedRoute>} />
            <Route path="/assistant-commissioner" element={<RoleProtectedRoute allowedRoles={['AssistantCommissioner', 'Admin', 'admin']}><AssistantCommissioner /></RoleProtectedRoute>} />
            <Route path="/history" element={<RoleProtectedRoute allowedRoles={['ROLE_AUDITOR', 'Admin', 'admin']}><History /></RoleProtectedRoute>} />
            <Route path="/reports/:id" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'DirectorIntelligence', 'DirectorInvestigation', 'InvestigationOfficer', 'AssistantCommissioner', 'legalAdvisor', 'Admin', 'admin']}><ReportView /></RoleProtectedRoute>} />
            <Route path="/reports/:caseNum" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'DirectorIntelligence', 'DirectorInvestigation', 'InvestigationOfficer', 'AssistantCommissioner', 'legalAdvisor', 'Admin', 'admin']}><ReportView /></RoleProtectedRoute>} />
            <Route path="/reports/:id/findings" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'DirectorIntelligence', 'DirectorInvestigation', 'InvestigationOfficer', 'AssistantCommissioner', 'legalAdvisor', 'Admin', 'admin']}><FindingsViewerPage /></RoleProtectedRoute>} />
            <Route path="/view-report/:id" element={<RoleProtectedRoute allowedRoles={['User', 'IntelligenceOfficer', 'DirectorIntelligence', 'DirectorInvestigation', 'InvestigationOfficer', 'AssistantCommissioner', 'legalAdvisor', 'Admin', 'admin']}><ViewReportDetails /></RoleProtectedRoute>} />
            <Route path="/assistant-commissioner/fines-report" element={<RoleProtectedRoute allowedRoles={['AssistantCommissioner', 'Admin', 'admin']}><FinesReport /></RoleProtectedRoute>} />
            <Route path="/director-intelligence/case-reports" element={<RoleProtectedRoute allowedRoles={['DirectorIntelligence', 'Admin', 'admin']}><DirectorIntelligenceCaseReports /></RoleProtectedRoute>} />
            <Route path="/reports/t3-officers" element={<RoleProtectedRoute allowedRoles={['DirectorIntelligence', 'Admin', 'admin']}><T3OfficersReports /></RoleProtectedRoute>} />
            <Route path="/legal-advisor" element={<RoleProtectedRoute allowedRoles={['legalAdvisor', 'Admin', 'admin']}><LegalAdvisor /></RoleProtectedRoute>} />
            <Route
                path="/intelligence-officer/edit-report/:reportId"
                element={
                    <ProtectedRoute>
                        <EditReport />
                    </ProtectedRoute>
                }
            />
            <Route path="/stock-management" element={<RoleProtectedRoute allowedRoles={['StockManager', 'Admin', 'admin']}><StockManagement /></RoleProtectedRoute>} />
            <Route path="/system-admin" element={<RoleProtectedRoute allowedRoles={['Admin', 'admin']}><SystemAdmin /></RoleProtectedRoute>} />
            <Route path="/surveillence-officer/releases" element={<RoleProtectedRoute allowedRoles={['Surveillance', 'Admin', 'admin']}><PrsoReleases /></RoleProtectedRoute>} />
        </Routes >
    );
};

import { NotificationProvider } from './NotificationComponents/NotificationContext';

const NotificationWrapper = ({ children }) => {
    const { authState } = useContext(AuthContext);
    return (
        <NotificationProvider employeeId={authState?.employeeId}>
            {children}
        </NotificationProvider>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <NotificationWrapper>
                    <AppRoutes />
                </NotificationWrapper>
            </AuthProvider>
        </Router>
    );
}

export default App;