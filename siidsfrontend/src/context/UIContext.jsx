import React, { createContext, useState, useContext } from 'react';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });

    // Show snackbar with message and severity
    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    // Close snackbar
    const closeSnackbar = () => {
        setSnackbar(prev => ({
            ...prev,
            open: false
        }));
    };

    // Clear error
    const clearError = () => {
        setError(null);
    };

    return (
        <UIContext.Provider value={{
            loading,
            setLoading,
            error,
            setError,
            clearError,
            snackbar,
            showSnackbar,
            closeSnackbar
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);