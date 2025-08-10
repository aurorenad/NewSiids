import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: null,
        userId: null,
        employeeId: null,
        name: null,
        role: null,
    });

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const name = localStorage.getItem('name') || sessionStorage.getItem('name');  // Get name from storage
        const role = localStorage.getItem('role') || sessionStorage.getItem('role');
        if (token && employeeId) {
            setAuthState({
                token,
                userId,
                employeeId,
                name,
                role,
            });
        }
    }, []);

    const login = (userId, token, employeeId, name, remember, role) => {
        if (remember) {
            localStorage.setItem('token', token);
            localStorage.setItem('employeeId', employeeId);
            localStorage.setItem('userId', userId);
            localStorage.setItem('name', name);
            localStorage.setItem('role', role);
        } else {
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('employeeId', employeeId);
            sessionStorage.setItem('userId', userId);
            sessionStorage.setItem('name', name);
            sessionStorage.setItem('role', role);
        }
        setAuthState({ token, userId, employeeId, name, role });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('employeeId');
        localStorage.removeItem('userId');
        localStorage.removeItem('name');  // Remove name
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('employeeId');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('name');  // Remove name
        setAuthState({
            token: null,
            userId: null,
            employeeId: null,
            name: null
        });
    };

    return (
        <AuthContext.Provider value={{
            authState,
            currentUser: authState,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};