import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: null,
        userId: null,
        employeeId: null
    });

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');

        if (token && employeeId) {
            setAuthState({
                token,
                userId,
                employeeId
            });
        }
    }, []);

    const login = (userId, token, employeeId, remember) => {
        if (remember) {
            localStorage.setItem('token', token);
            localStorage.setItem('employeeId', employeeId);
            localStorage.setItem('userId', userId);
        } else {
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('employeeId', employeeId);
            sessionStorage.setItem('userId', userId);
        }
        setAuthState({ token, userId, employeeId });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('employeeId');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('employeeId');
        sessionStorage.removeItem('userId');
        setAuthState({ token: null, userId: null, employeeId: null });
    };

    return (
        <AuthContext.Provider value={{ authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};