import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    Divider,
} from '@mui/material';
import {
    Policy,
    Search,
    Visibility,
    Gavel,
    AdminPanelSettings,
    Inventory,
    History,
    Shield,
    CameraOutdoor,
    Assignment,
    FactCheck,
    ManageAccounts,
    Storefront,
} from '@mui/icons-material';
import { hasAnyPermission, hasPermission } from '../utils/authorization';
import { PERMISSIONS } from '../constants/permissions';
import { ROUTES } from '../constants/routes';

const SIDEBAR_WIDTH = 260;

const Sidebar = () => {
    const { authState } = useContext(AuthContext);
    const location = useLocation();
    const can = (permission) => hasPermission(authState, permission);
    const canAny = (permissions) => hasAnyPermission(authState, permissions);

    const isActive = (path) => location.pathname.startsWith(path);

    const menuSections = [
        {
            key: 'overview',
            label: 'Overview',
            links: [
                can(PERMISSIONS.USER_VIEW) && { to: ROUTES.SYSTEM_ADMIN, label: 'System Admin', icon: <AdminPanelSettings /> },
                can(PERMISSIONS.AUDIT_VIEW) && { to: ROUTES.HISTORY, label: 'Audit Logs', icon: <History /> },
            ].filter(Boolean),
        },
        {
            key: 'investigation',
            label: 'Investigation',
            links: [
                canAny([PERMISSIONS.REPORT_CREATE, PERMISSIONS.REPORT_VIEW]) && { to: ROUTES.INVESTIGATION_OFFICER, label: 'Investigation Officer', icon: <Search /> },
                canAny([PERMISSIONS.REPORT_APPROVE_INVESTIGATION, PERMISSIONS.REPORT_ASSIGN_INVESTIGATION]) && { to: ROUTES.DIRECTOR_INVESTIGATION, label: 'Director Investigation', icon: <FactCheck /> },
            ].filter(Boolean),
        },
        {
            key: 'intelligence',
            label: 'Intelligence',
            links: [
                can(PERMISSIONS.REPORT_APPROVE_INTELLIGENCE) && { to: ROUTES.DIRECTOR_INTELLIGENCE, label: 'Director Intelligence', icon: <Policy /> },
                canAny([PERMISSIONS.REPORT_CREATE, PERMISSIONS.REPORT_VIEW]) && { to: ROUTES.INTELLIGENCE_OFFICER, label: 'Intelligence Officer', icon: <Assignment /> },
            ].filter(Boolean),
        },
        {
            key: 'surveillance',
            label: 'Surveillance',
            links: [
                can(PERMISSIONS.SURVEILLANCE_VIEW) && { to: ROUTES.SURVEILLANCE, label: 'Surveillance Officer', icon: <CameraOutdoor /> },
                can(PERMISSIONS.STOCK_VIEW) && { to: ROUTES.TEMPORARY_STOCK, label: 'Temporary Stock', icon: <Storefront /> },
            ].filter(Boolean),
        },
        {
            key: 'stock',
            label: 'Stock',
            links: [
                can(PERMISSIONS.STOCK_VIEW) && { to: ROUTES.STOCK_INVENTORY, label: 'Main Stock Inventory', icon: <Inventory /> },
                can(PERMISSIONS.STOCK_APPROVE_RELEASE) && { to: ROUTES.PRSO_APPROVALS, label: 'PRSO Approvals', icon: <Visibility /> },
            ].filter(Boolean),
        },
        {
            key: 'commission',
            label: 'Commission',
            links: [
                can(PERMISSIONS.REPORT_APPROVE_ASSISTANT_COMMISSIONER) && { to: ROUTES.ASSISTANT_COMMISSIONER, label: 'Assistant Commissioner', icon: <Shield /> },
                can(PERMISSIONS.LEGAL_REVIEW) && { to: ROUTES.LEGAL_ADVISOR, label: 'Legal Advisor', icon: <Gavel /> },
            ].filter(Boolean),
        },
    ].filter((section) => section.links.length > 0);

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: { xs: 72, md: SIDEBAR_WIDTH },
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: { xs: 72, md: SIDEBAR_WIDTH },
                    background: 'linear-gradient(180deg, #0D47A1 0%, #1565C0 100%)',
                    color: '#fff',
                    border: 'none',
                    overflowX: 'hidden',
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
                <Typography variant="h6" fontWeight={700} letterSpacing={1} sx={{ display: { xs: 'none', md: 'block' } }}>SIID</Typography>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', mx: 2 }} />

            {/* Navigation */}
            <List component="nav" sx={{ px: 1, py: 1.5, flex: 1, overflowY: 'auto' }}>
                {menuSections.map((section) => (
                    <Box key={section.key} sx={{ mb: { xs: 1, md: 2 } }}>
                        <Typography
                            variant="caption"
                            sx={{
                                display: { xs: 'none', md: 'block' },
                                px: 1.5,
                                mb: 0.75,
                                color: 'rgba(255,255,255,0.55)',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                letterSpacing: 1.2,
                                textTransform: 'uppercase',
                            }}
                        >
                            {section.label}
                        </Typography>

                        {section.links.map((link) => (
                            <ListItemButton
                                key={link.to}
                                component={NavLink}
                                to={link.to}
                                selected={isActive(link.to)}
                                sx={{
                                    justifyContent: { xs: 'center', md: 'flex-start' },
                                    minHeight: 44,
                                    px: { xs: 1, md: 1.5 },
                                    borderRadius: '10px',
                                    mb: 0.4,
                                    color: 'rgba(255,255,255,0.82)',
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(255,255,255,0.18)',
                                        color: '#fff',
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.22)' },
                                    },
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: 'inherit',
                                        minWidth: { xs: 0, md: 36 },
                                        justifyContent: 'center',
                                    }}
                                >
                                    {link.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={link.label}
                                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, noWrap: true }}
                                    sx={{ display: { xs: 'none', md: 'block' } }}
                                />
                            </ListItemButton>
                        ))}
                    </Box>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
