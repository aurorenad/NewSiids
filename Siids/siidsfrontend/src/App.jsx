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

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Login />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/director-intelligence" element={<ProtectedRoute><DirectorIntelligence /></ProtectedRoute>} />
            <Route path="/intelligence-officer" element={<ProtectedRoute><IntelligenceOfficer /></ProtectedRoute>} />
            <Route path="/intelligence-officer/newCase" element={<ProtectedRoute><NewCase /></ProtectedRoute>} />
            <Route path="/intelligence-officer/view-case/*" element={<ProtectedRoute><TaxReportView /></ProtectedRoute>} />
            <Route path="/intelligence-officer/claim-form/:caseNum" element={<ProtectedRoute><ClaimForm /></ProtectedRoute>} />
            <Route path="/investigation-officer" element={<ProtectedRoute><InvestigationOfficer /></ProtectedRoute>} />
            <Route path="/surveillence-officer" element={<ProtectedRoute><SurveillenceOfficer /></ProtectedRoute>} />
            <Route path="/surveillence-officer/New" element={<ProtectedRoute><NewSurveillenceCase /></ProtectedRoute>} />
            <Route path="/surveillence-officer/view/*" element={<ProtectedRoute><SurveillanceCaseView /></ProtectedRoute>} />
            <Route path="/surveillence-officer/sclaim-form/:caseNum" element={<ProtectedRoute><SClaimForm /></ProtectedRoute>} />
            <Route path="/Director-Investigation" element={<ProtectedRoute><DirectorInvestigation /></ProtectedRoute>} />
            <Route path="/assistant-commissioner" element={<ProtectedRoute><AssistantCommissioner /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />
            <Route path="/reports/:caseNum" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />
            <Route path="/reports/:id/findings" element={<ProtectedRoute><FindingsViewerPage /></ProtectedRoute>} />
            <Route path="/view-report/:id" element={<ProtectedRoute><ViewReportDetails /></ProtectedRoute>} />
            <Route path="/assistant-commissioner/fines-report" element={<ProtectedRoute><FinesReport /></ProtectedRoute>} />
            <Route path="/director-intelligence/case-reports" element={<ProtectedRoute><DirectorIntelligenceCaseReports /></ProtectedRoute>} />
            <Route path="/reports/t3-officers" element={<ProtectedRoute><T3OfficersReports /></ProtectedRoute>} />
            <Route path="/legal-advisor" element={<ProtectedRoute><LegalAdvisor /></ProtectedRoute>} />
            <Route
                path="/intelligence-officer/edit-report/:reportId"
                element={
                    <ProtectedRoute>
                        <EditReport />
                    </ProtectedRoute>
                }
            />
            <Route path="/stock-management" element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />
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