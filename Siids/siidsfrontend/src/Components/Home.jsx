import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { Dashboard } from '@mui/icons-material';

const Home = () => {
    const { authState } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (authState && authState.role === 'StockManager') {
            navigate('/stock-management');
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