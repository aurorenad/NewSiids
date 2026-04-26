import React, { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    Typography,
    Avatar,
    Divider,
} from '@mui/material';
import {
    ExpandLess,
    ExpandMore,
    Policy,
    Search,
    Visibility,
    Gavel,
    AdminPanelSettings,
    Inventory,
    History,
    Shield,
    CameraOutdoor,
} from '@mui/icons-material';

const SIDEBAR_WIDTH = 260;

const Sidebar = () => {
    const { authState } = useContext(AuthContext);
    const [openMenus, setOpenMenus] = useState({});
    const location = useLocation();
    const role = authState?.role;
    const isOpsRole = !['StockManager', 'legalAdvisor', 'Admin', 'admin', 'PRSO'].includes(role);

    const toggle = (key) => setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
    const isActive = (path) => location.pathname.startsWith(path);

    const sectionIcons = {
        intelligence: <Policy />,
        investigation: <Search />,
        surveillance: <CameraOutdoor />,
        commission: <Gavel />,
    };

    const menuSections = [
        {
            key: 'intelligence',
            label: 'Intelligence',
            visible: isOpsRole,
            links: [
                role === 'DirectorIntelligence' && { to: '/director-intelligence', label: 'Director Intelligence' },
                (role === 'User' || role === 'IntelligenceOfficer') && { to: '/intelligence-officer', label: 'Intelligence Officer' },
                role === 'Surveillance' && { to: '/surveillence-officer', label: 'Surveillance Officer' },
            ].filter(Boolean),
        },
        {
            key: 'investigation',
            label: 'Investigation',
            visible: isOpsRole,
            links: [
                role === 'InvestigationOfficer' && { to: '/investigation-officer', label: 'Investigation Officer' },
                role === 'DirectorInvestigation' && { to: '/director-investigation', label: 'Director Investigation' },
            ].filter(Boolean),
        },
        {
            key: 'surveillance',
            label: 'Surveillance',
            visible: isOpsRole,
            links: [role === 'Surveillance' && { to: '/surveillence-officer/releases', label: 'PRSO' }].filter(Boolean),
        },
        {
            key: 'commission',
            label: 'Commission',
            visible: role === 'legalAdvisor',
            links: [
                role === 'legalAdvisor' && { to: '/legal-advisor', label: 'Legal Advisor' },
            ].filter(Boolean),
        },
    ];

    const standaloneLinks = [
        role === 'AssistantCommissioner' && { to: '/assistant-commissioner', label: 'Assistant Commissioner', icon: <Shield /> },
        role === 'ROLE_AUDITOR' && { to: '/history', label: 'Audit Logs', icon: <History /> },
        (role === 'Admin' || role === 'admin') && { to: '/system-admin', label: 'System Admin', icon: <AdminPanelSettings /> },
        role === 'StockManager' && { to: '/stock-management', label: 'Stock Management', icon: <Inventory /> },
        role === 'PRSO' && { to: '/surveillence-officer/releases', label: 'PRSO', icon: <Visibility /> },
    ].filter(Boolean);

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: SIDEBAR_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: SIDEBAR_WIDTH,
                    background: 'linear-gradient(180deg, #0D47A1 0%, #1565C0 100%)',
                    color: '#fff',
                    border: 'none',
                },
            }}
        >
            {/* Logo & Brand */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, px: 2 }}>
                <Avatar
                    src="/Images/HomeLogo.jpeg"
                    alt="SIIDS"
                    sx={{ width: 80, height: 80, mb: 1, border: '2px solid rgba(255,255,255,0.5)', bgcolor: '#fff' }}
                    imgProps={{ style: { objectFit: 'contain' } }}
                />
                <Typography variant="h6" fontWeight={700} letterSpacing={1}>SIID</Typography>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', mx: 2 }} />

            {/* Navigation */}
            <List component="nav" sx={{ px: 1, py: 1, flex: 1 }}>
                {menuSections
                    .filter((s) => s.visible && s.links.length > 0)
                    .map((section) => (
                        <React.Fragment key={section.key}>
                            <ListItemButton
                                onClick={() => toggle(section.key)}
                                sx={{
                                    borderRadius: '10px',
                                    mb: 0.5,
                                    color: '#fff',
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                                }}
                            >
                                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.8)', minWidth: 36 }}>
                                    {sectionIcons[section.key] || <Policy />}
                                </ListItemIcon>
                                <ListItemText primary={section.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
                                {openMenus[section.key] ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                            <Collapse in={openMenus[section.key]} timeout="auto" unmountOnExit>
                                <List disablePadding>
                                    {section.links.map((link) => (
                                        <ListItemButton
                                            key={link.to}
                                            component={NavLink}
                                            to={link.to}
                                            selected={isActive(link.to)}
                                            sx={{
                                                pl: 6,
                                                borderRadius: '10px',
                                                mb: 0.25,
                                                color: 'rgba(255,255,255,0.75)',
                                                '&.Mui-selected': {
                                                    backgroundColor: 'rgba(255,255,255,0.18)',
                                                    color: '#fff',
                                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
                                                },
                                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                                            }}
                                        >
                                            <ListItemText primary={link.label} primaryTypographyProps={{ fontSize: '0.8125rem' }} />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Collapse>
                        </React.Fragment>
                    ))}

                {standaloneLinks.map((link) => (
                    <ListItemButton
                        key={link.to}
                        component={NavLink}
                        to={link.to}
                        selected={isActive(link.to)}
                        sx={{
                            borderRadius: '10px',
                            mb: 0.5,
                            color: '#fff',
                            '&.Mui-selected': {
                                backgroundColor: 'rgba(255,255,255,0.18)',
                                color: '#fff',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
                            },
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                        }}
                    >
                        <ListItemIcon sx={{ color: 'rgba(255,255,255,0.8)', minWidth: 36 }}>
                            {link.icon}
                        </ListItemIcon>
                        <ListItemText primary={link.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
                    </ListItemButton>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
