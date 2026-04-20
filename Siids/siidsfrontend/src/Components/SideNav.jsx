import React, { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
    const [isIntelligenceOpen, setIntelligenceOpen] = useState(false);
    const [isInvestigationOpen, setInvestigationOpen] = useState(false);
    const [isSurveillanceOpen, setSurveillanceOpen] = useState(false);
    const [isCommissionOpen, setCommissionOpen] = useState(false);
    const { authState } = useContext(AuthContext);

    const toggleIntelligence = () => {
        setIntelligenceOpen(!isIntelligenceOpen);
    };

    const toggleInvestigation = () => {
        setInvestigationOpen(!isInvestigationOpen);
    };

    const toggleSurveillance = () => {
        setSurveillanceOpen(!isSurveillanceOpen);
    };

    const toggleCommission = () => {
        setCommissionOpen(!isCommissionOpen);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src="/Images/HomeLogo.jpeg" />
                </div>
                <h3>SIID</h3>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {(authState.role !== 'StockManager' && authState.role !== 'legalAdvisor' && authState.role !== 'Admin' && authState.role !== 'admin') && (
                        <li>
                            <div onClick={toggleIntelligence} className="sidebar-item">
                                Intelligence
                            </div>
                        {isIntelligenceOpen && (
                            <ul className="submenu">
                                {(authState.role === 'DirectorIntelligence') && (
                                    <li>
                                        <NavLink to="/director-intelligence" className={({ isActive }) => isActive ? 'active' : ''}>
                                            Director Intelligence
                                        </NavLink>
                                    </li>
                                )}
                                {(authState.role === 'User' || authState.role === 'IntelligenceOfficer') && (
                                    <li>
                                        <NavLink to="/intelligence-officer" className={({ isActive }) => isActive ? 'active' : ''}>
                                            Intelligence Officer
                                        </NavLink>
                                    </li>
                                )}
                                {(authState.role === 'Surveillance') && (
                                    <li>
                                        <NavLink to='/surveillence-officer' className={({ isActive }) => isActive ? 'active' : ''}>
                                            Surveillance Officer
                                        </NavLink>
                                    </li>
                                )}
                            </ul>
                        )}
                    </li>
                    )}
                    {(authState.role !== 'StockManager' && authState.role !== 'legalAdvisor' && authState.role !== 'Admin' && authState.role !== 'admin') && (
                    <li>
                        <div onClick={toggleInvestigation} className="sidebar-item">
                            Investigation
                        </div>
                        {isInvestigationOpen && (
                            <ul className="submenu">
                                {(authState.role === 'InvestigationOfficer') && (
                                    <li>
                                        <NavLink to="/investigation-officer" className={({ isActive }) => isActive ? 'active' : ''}>
                                            Investigation Officer
                                        </NavLink>
                                    </li>
                                )}
                                {(authState.role === 'DirectorInvestigation') && (
                                    <li>
                                        <NavLink to="/director-investigation" className={({ isActive }) => isActive ? 'active' : ''}>
                                            Director Investigation
                                        </NavLink>
                                    </li>
                                )}
                            </ul>
                        )}
                    </li>
                    )}
                    {(authState.role !== 'StockManager' && authState.role !== 'legalAdvisor' && authState.role !== 'Admin' && authState.role !== 'admin') && (
                    <li>
                        <div onClick={toggleSurveillance} className="sidebar-item">
                            Surveillance
                        </div>
                        {isSurveillanceOpen && (
                            <ul className="submenu">
                                {(authState.role === 'Surveillance') && (
                                    <li>
                                        <NavLink to='/surveillence-officer/releases' className={({ isActive }) => isActive ? 'active' : ''}>
                                            PRSO
                                        </NavLink>
                                    </li>
                                )}
                            </ul>
                        )}
                    </li>
                    )}
                    {(authState.role === 'AssistantCommissioner') && (
                        <li>
                            <NavLink to="/assistant-commissioner" className={({ isActive }) => isActive ? 'active' : ''}>
                                Assistant Commissioner
                            </NavLink>
                        </li>
                    )}
                    {(authState.role === 'ROLE_AUDITOR') && (
                        <li>
                            <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
                                Audit Logs
                            </NavLink>
                        </li>
                    )}
                    {(authState.role === 'StockManager' || authState.role === 'legalAdvisor') && (
                    <li>
                        <div onClick={toggleCommission} className="sidebar-item">
                            Commission
                        </div>
                        {isCommissionOpen && (
                            <ul className="submenu">
                                {(authState.role === 'legalAdvisor') && (
                                    <li>
                                        <NavLink to="/legal-advisor" className={({ isActive }) => isActive ? 'active' : ''}>
                                            Legal Advisor
                                        </NavLink>
                                    </li>
                                )}
                                {(authState.role === 'StockManager') && (
                                    <li>
                                        <NavLink to="/stock-management" className={({ isActive }) => isActive ? 'active' : ''}>
                                            Stock Management
                                        </NavLink>
                                    </li>
                                )}
                            </ul>
                        )}
                    </li>
                    )}
                    {(authState.role === 'Admin' || authState.role === 'admin') && (
                        <li>
                            <NavLink to="/system-admin" className={({ isActive }) => isActive ? 'active' : ''}>
                                System Admin
                            </NavLink>
                        </li>
                    )}
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;
