import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Home from './Components/Home.jsx'
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
import NewCase from './Components/TaxReportForm.jsx'
import './App.css';
import {ClaimForm} from "./Components/ClaimForm.jsx";
import {SClaimForm} from "./Components/SClaimForm.jsx"
import SurveillanceCaseView from "./Components/SurveillenceOffice/SurveillanceCaseView.jsx";

const ProtectedRoute = ({ children }) => {
    const { currentUser } = useContext(AuthContext);

    if (!currentUser) {
        return <Navigate to="/login" />;
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

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route
                        path="home"
                        element={
                            <ProtectedRoute>
                                <Home />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="home"
                        element={
                            <ProtectedRoute>
                                <Sidebar />
                            </ProtectedRoute>
                        }
                    />


                    <Route
                        path="director-intelligence"
                        element={
                            <ProtectedRoute>
                                <DirectorIntelligence />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="intelligence-officer"
                        element={
                            <ProtectedRoute>
                                <IntelligenceOfficer />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="intelligence-officer/newCase"
                        element={
                            <ProtectedRoute>
                            <NewCase />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="intelligence-officer/view"
                        element={
                            <ProtectedRoute>
                                <TaxReportView/>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="intelligence-officer/attachment"
                        element={
                            <ProtectedRoute>
                                <ClaimForm />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="investigation-officer"
                        element={
                        <ProtectedRoute>
                            <InvestigationOfficer/>
                        </ProtectedRoute>
                        }
                    />
                    <Route
                        path="surveillence-officer"
                        element={
                            <ProtectedRoute>
                             <SurveillenceOfficer/>
                            </ProtectedRoute>
                    }/>
                    <Route
                        path="surveillence-officer/New"
                        element={
                            <ProtectedRoute>
                                <NewSurveillenceCase/>
                            </ProtectedRoute>
                        }/>
                    <Route
                        path="surveillence-officer/view"
                        element={
                            <ProtectedRoute>
                                <SurveillanceCaseView />
                            </ProtectedRoute>
                        }/>
                    <Route
                        path="surveillence/attachment"
                        element={
                            <ProtectedRoute>
                                <SClaimForm />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="Director-Investigation"
                        element={
                            <ProtectedRoute>
                                <DirectorInvestigation/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="assistant-commissioner"
                        element={
                            <ProtectedRoute>
                                <AssistantCommissioner />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="history"
                        element={
                            <ProtectedRoute>
                                <History />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;