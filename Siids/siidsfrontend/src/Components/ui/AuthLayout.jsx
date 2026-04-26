import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';

const AuthLayout = ({ title, subtitle, maxWidth = 'sm', children }) => {
    return (
        <Box className="mdc-auth-page">
            <Container maxWidth={maxWidth}>
                <Paper className="mdc-surface mdc-auth-card" elevation={0}>
                    {(title || subtitle) && (
                        <Box className="mdc-auth-header">
                            {title && <Typography variant="h5">{title}</Typography>}
                            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
                        </Box>
                    )}
                    {children}
                </Paper>
            </Container>
        </Box>
    );
};

export default AuthLayout;
