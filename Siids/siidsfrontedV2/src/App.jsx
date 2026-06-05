import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './features/dashboard/Login';
import ForgotPassword from './features/dashboard/ForgotPassword';
import SurveillanceDashboard from './features/stock/SurveillanceDashboard';
import StockManagerDashboard from './features/stock/StockManagerDashboard';
import PrsoDashboard from './features/stock/PrsoDashboard';
import AcDashboard from './features/intelligence/AcDashboard';
import DoiDashboard from './features/intelligence/DoiDashboard';
import InvestigationOfficerDashboard from './features/intelligence/InvestigationOfficerDashboard';
import InvestigationDirectorDashboard from './features/intelligence/InvestigationDirectorDashboard';
import IntelligenceOfficerDashboard from './features/intelligence/IntelligenceOfficerDashboard';
import AdminDashboard from './features/dashboard/AdminDashboard';
import './App.css';

// Route Guard Component protecting routes by role authorization
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="siids-app-loading-screen">Verifying active session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not authorized for this specific sub-dashboard, redirect to home dispatcher
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main Home Route dispatcher based on user roles
const HomeDispatcher = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="siids-app-loading-screen">Verifying active session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'SURVEILLANCE_OFFICER':
      return <Navigate to="/surveillance" replace />;
    case 'STOCK_MANAGER':
      return <Navigate to="/stock-manager" replace />;
    case 'PRSO':
    case 'DEPUTY_PRSO':
      return <Navigate to="/prso" replace />;
    case 'ASSISTANT_COMMISSIONER':
      return <Navigate to="/ac" replace />;
    case 'DIRECTOR_OF_INTELLIGENCE':
      return <Navigate to="/doi" replace />;
    case 'DIRECTOR_OF_INVESTIGATION':
      return <Navigate to="/investigation-director" replace />;
    case 'INVESTIGATION_OFFICER':
      return <Navigate to="/investigation-officer" replace />;
    case 'INTELLIGENCE_OFFICER':
      return <Navigate to="/intelligence-officer" replace />;
    case 'Admin':
      return <Navigate to="/admin" replace />;
    default:
      return <div className="unauthorized-role-banner">User profile holds no operational roles. Contact administrator.</div>;
  }
};

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Dashboard Views */}
        <Route 
          path="/surveillance" 
          element={
            <ProtectedRoute allowedRoles={['SURVEILLANCE_OFFICER']}>
              <SurveillanceDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/stock-manager" 
          element={
            <ProtectedRoute allowedRoles={['STOCK_MANAGER']}>
              <StockManagerDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/prso" 
          element={
            <ProtectedRoute allowedRoles={['PRSO', 'DEPUTY_PRSO']}>
              <PrsoDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/ac" 
          element={
            <ProtectedRoute allowedRoles={['ASSISTANT_COMMISSIONER']}>
              <AcDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/ac/analytics" 
          element={
            <ProtectedRoute allowedRoles={['ASSISTANT_COMMISSIONER']}>
              <AcDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/doi" 
          element={
            <ProtectedRoute allowedRoles={['DIRECTOR_OF_INTELLIGENCE']}>
              <DoiDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/doi/reports" 
          element={
            <ProtectedRoute allowedRoles={['DIRECTOR_OF_INTELLIGENCE']}>
              <DoiDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/investigation-officer" 
          element={
            <ProtectedRoute allowedRoles={['INVESTIGATION_OFFICER']}>
              <InvestigationOfficerDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/investigation-director" 
          element={
            <ProtectedRoute allowedRoles={['DIRECTOR_OF_INVESTIGATION']}>
              <InvestigationDirectorDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/investigation-director/reports" 
          element={
            <ProtectedRoute allowedRoles={['DIRECTOR_OF_INVESTIGATION']}>
              <InvestigationDirectorDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/intelligence-officer" 
          element={
            <ProtectedRoute allowedRoles={['INTELLIGENCE_OFFICER']}>
              <IntelligenceOfficerDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/intelligence-officer/reports" 
          element={
            <ProtectedRoute allowedRoles={['INTELLIGENCE_OFFICER']}>
              <IntelligenceOfficerDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Global Root Dispatcher & Fallback */}
        <Route path="/" element={<HomeDispatcher />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
