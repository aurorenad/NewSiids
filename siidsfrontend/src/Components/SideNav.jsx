import React, {useContext, useState} from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';
import { AuthContext } from '../context/AuthContext';

const Sidebar = () => {
    const [isIntelligenceOpen, setIntelligenceOpen] = useState(false);
    const [isInvestigationOpen, setInvestigationOpen] = useState(false);
    const { authState } = useContext(AuthContext);

    const toggleIntelligence = () => {
        setIntelligenceOpen(!isIntelligenceOpen);
    };

    const toggleInvestigation = () => {
        setInvestigationOpen(!isInvestigationOpen);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src="../../public/Images/HomeLogo.jpeg"/>
                </div>
                <h3>SIID</h3>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    <li>
                        <div onClick={toggleIntelligence} className="sidebar-item">
                            Intelligence
                        </div>
                        {isIntelligenceOpen && (
                            <ul className="submenu">
                                <li>
                                    <NavLink to="/director-intelligence" className={({ isActive }) => isActive ? 'active' : ''}>
                                        Director Intelligence
                                    </NavLink>
                                </li>
                                {authState.role === 'User' && (
                                <li>
                                    <NavLink to="/intelligence-officer" className={({ isActive }) => isActive ? 'active' : ''}>
                                        Intelligence Officer
                                    </NavLink>
                                </li>)}
                                {authState.role === 'Surveillance' && (
                                <li>
                                    <NavLink to='/surveillence-officer' className={({isActive}) => isActive ? 'active': ''}>
                                        Surveillence Officer
                                    </NavLink>
                                </li>
                                    )}
                            </ul>
                        )}
                    </li>
                    <li>
                        <div onClick={toggleInvestigation} className="sidebar-item">
                            Investigation
                        </div>
                        {isInvestigationOpen && (
                            <ul className="submenu">
                                <li>
                                    <NavLink to="/investigation-officer" className={({ isActive }) => isActive ? 'active' : ''}>
                                        Investigation Officer
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/director-investigation" className={({ isActive }) => isActive ? 'active' : ''}>
                                        Director Investigation
                                    </NavLink>
                                </li>
                            </ul>
                        )}
                    </li>
                    <li>
                        <NavLink to="/assistant-commissioner" className={({ isActive }) => isActive ? 'active' : ''}>
                            Assistant Commissioner
                        </NavLink>
                    </li>
                    {authState.role === 'ROLE_AUDITOR' && (
                        <li>
                            <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
                                Audit Logs
                            </NavLink>
                        </li>
                    )}
                    {authState.role === 'legalAdvisor' && (
                        <li>
                            <NavLink to="/legal-advisor" className={({ isActive }) => isActive ? 'active' : ''}>
                                Legal Advisor
                            </NavLink>
                        </li>
                    )}
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;
