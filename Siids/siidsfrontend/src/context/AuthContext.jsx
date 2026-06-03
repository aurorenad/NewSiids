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
        permissions: [],
        profile: {}, // Defensive initialization
    });

    const [loading, setLoading] = useState(true);

    const readStoredPermissions = () => {
        try {
            const storedPermissions = localStorage.getItem('permissions') || sessionStorage.getItem('permissions') || '[]';
            const parsed = JSON.parse(storedPermissions);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const name = localStorage.getItem('name') || sessionStorage.getItem('name');
        const role = localStorage.getItem('role') || sessionStorage.getItem('role');
        const permissions = readStoredPermissions();

        if (token && employeeId) {
            setAuthState({
                token,
                userId,
                employeeId,
                name,
                role,
                permissions,
                profile: {}, 
            });
        }
        setLoading(false);
    }, []);

    const login = (userId, token, employeeId, name, remember, role, permissions = []) => {
        const storage = remember ? localStorage : sessionStorage;
        
        storage.setItem('token', token);
        storage.setItem('employeeId', employeeId);
        storage.setItem('userId', userId);
        storage.setItem('name', name);
        storage.setItem('role', role);
        storage.setItem('permissions', JSON.stringify(permissions));

        setAuthState({ 
            token, 
            userId, 
            employeeId, 
            name, 
            role, 
            permissions,
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
            permissions: [],
            profile: {},
        });
    };

    const getSafeAuth = (state) => {
        if (!state) return { profile: {} };
        return {
            ...state,
            profile: state.profile || {}
        };
    };

    return (
        <AuthContext.Provider value={{
            authState: getSafeAuth(authState),
            currentUser: getSafeAuth(authState),
            login,
            logout,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};
