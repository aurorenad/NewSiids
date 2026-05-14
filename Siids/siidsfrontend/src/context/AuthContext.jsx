import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext({
    authState: { profile: {} },
    currentUser: { profile: {} },
    loading: true,
    login: () => {},
    logout: () => {}
});

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: null,
        userId: null,
        employeeId: null,
        name: null,
        role: null,
        profile: {}, // Defensive initialization
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const name = localStorage.getItem('name') || sessionStorage.getItem('name');
        const role = localStorage.getItem('role') || sessionStorage.getItem('role');

        if (token && employeeId) {
            setAuthState({
                token,
                userId,
                employeeId,
                name,
                role,
                profile: {}, 
            });
        }
        setLoading(false);
    }, []);

    const login = (userId, token, employeeId, name, remember, role) => {
        const storage = remember ? localStorage : sessionStorage;
        
        storage.setItem('token', token);
        storage.setItem('employeeId', employeeId);
        storage.setItem('userId', userId);
        storage.setItem('name', name);
        storage.setItem('role', role);

        setAuthState({ 
            token, 
            userId, 
            employeeId, 
            name, 
            role, 
            profile: {} 
        });
    };

    const logout = () => {
        localStorage.clear();
        sessionStorage.clear();
        setAuthState({
            token: null,
            userId: null,
            employeeId: null,
            name: null,
            role: null,
            profile: {},
        });
    };

    return (
        <AuthContext.Provider value={{
            authState,
            currentUser: authState || { profile: {} },
            login,
            logout,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};