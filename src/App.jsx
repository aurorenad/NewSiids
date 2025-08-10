import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Home from './Components/Home.jsx';
import Login from './components/Login';
import Sidebar from './components/SideNav.jsx';
import Header from './components/Header';
import DirectorIntelligence from './components/DirectorIntelligence';
import IntelligenceOfficer from './components/IntelligenceOfficer';
import InvestigationOfficer from "./Components/InvestigationOfficer";
import DirectorInvestigation from "./Components/DirectorInvestigation";
import AssistantCommissioner from './components/AssistantCommissioner';
import SurveillenceOfficer from "./Components/SurveillenceOffice/SurveillenceOfficer.jsx";
import NewSurveillenceCase from "./Components/SurveillenceOffice/NewSurveillenceCase.jsx";
import TaxReportView from "./Components/TaxReportView.jsx";
import History from './components/History';
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

const ProtectedRoute = ({ children }) => {
    const { authState } = useContext(AuthContext);

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
            <Route path="/" element={<Login />} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/director-intelligence" element={<ProtectedRoute><DirectorIntelligence /></ProtectedRoute>} />
            <Route path="/intelligence-officer" element={<ProtectedRoute><IntelligenceOfficer /></ProtectedRoute>} />
            <Route path="/intelligence-officer/newCase" element={<ProtectedRoute><NewCase /></ProtectedRoute>} />
            <Route path="/intelligence-officer/view-case/*" element={<ProtectedRoute><TaxReportView /></ProtectedRoute>} />
            <Route path="/intelligence-officer/claim-form/:caseNum" element={<ProtectedRoute><ClaimForm /></ProtectedRoute>} />
            <Route path="/investigation-officer" element={<ProtectedRoute><InvestigationOfficer/></ProtectedRoute>} />
            <Route path="/surveillence-officer" element={<ProtectedRoute><SurveillenceOfficer/></ProtectedRoute>} />
            <Route path="/surveillence-officer/New" element={<ProtectedRoute><NewSurveillenceCase/></ProtectedRoute>} />
            <Route path="/surveillence-officer/view/*" element={<ProtectedRoute><SurveillanceCaseView /></ProtectedRoute>}/>
            <Route path="/surveillence-officer/sclaim-form/:caseNum" element={<ProtectedRoute><SClaimForm /></ProtectedRoute>} />
            <Route path="/Director-Investigation" element={<ProtectedRoute><DirectorInvestigation/></ProtectedRoute>} />
            <Route path="/assistant-commissioner" element={<ProtectedRoute><AssistantCommissioner /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute><ReportView /></ProtectedRoute>} />
            <Route path="/reports/:caseNum" element={<ProtectedRoute><ReportView /></ProtectedRoute> } />
            <Route path="/reports/:id/findings" element={<ProtectedRoute><FindingsViewerPage /></ProtectedRoute>} />
            <Route path="/view-report/:id" element={<ProtectedRoute><ViewReportDetails /></ProtectedRoute>} />
            <Route path="/assistant-commissioner/fines-report" element={<ProtectedRoute><FinesReport /></ProtectedRoute>} />
            <Route path="/director-intelligence/case-reports" element={<ProtectedRoute><DirectorIntelligenceCaseReports /></ProtectedRoute>}/>
            <Route path="/reports/t3-officers" element={<ProtectedRoute><T3OfficersReports /></ProtectedRoute>} />
        </Routes>
    );
};

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;