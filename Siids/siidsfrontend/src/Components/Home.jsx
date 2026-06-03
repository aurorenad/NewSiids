import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Dashboard } from '@mui/icons-material';
import { hasPermission } from '../utils/authorization';
import { PERMISSIONS } from '../constants/permissions';

const Home = () => {
    const { authState } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!authState?.token) return;

        if (hasPermission(authState, PERMISSIONS.USER_VIEW)) {
            navigate(ROUTES.SYSTEM_ADMIN);
        } else if (hasPermission(authState, PERMISSIONS.STOCK_APPROVE_RELEASE)) {
            navigate(ROUTES.PRSO_APPROVALS);
        } else if (hasPermission(authState, PERMISSIONS.STOCK_VIEW)) {
            navigate(ROUTES.STOCK_INVENTORY);
        } else if (hasPermission(authState, PERMISSIONS.SURVEILLANCE_VIEW)) {
            navigate(ROUTES.TEMPORARY_STOCK);
        }
    }, [authState, navigate]);

    return (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Dashboard color="primary" />
                    <Typography variant="h6" fontWeight={700}>Dashboard</Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                    Welcome{authState?.name ? `, ${authState.name}` : ''} to the Strategic Intelligence & Investigation Division System (SIIDS)
                </Typography>
            </CardContent>
        </Card>
    );
};

export default Home;
