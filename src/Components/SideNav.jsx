import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = () => {
    const [isIntelligenceOpen, setIntelligenceOpen] = useState(false);
    const [isInvestigationOpen, setInvestigationOpen] = useState(false);

    const toggleIntelligence = () => {
        setIntelligenceOpen(!isIntelligenceOpen);
    };

    const toggleInvestigation = () => {
        setInvestigationOpen(!isInvestigationOpen);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
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
                                <li>
                                    <NavLink to="/intelligence-officer" className={({ isActive }) => isActive ? 'active' : ''}>
                                        Intelligence Officer
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to='/surveillence-officer' className={({isActive}) => isActive ? 'active': ''}>
                                        Surveillence Officer
                                    </NavLink>
                                </li>
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
                    <li>
                        <NavLink to="/history" className={({ isActive }) => isActive ? 'active' : ''}>
                            Report
                        </NavLink>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;
