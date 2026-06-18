import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext({
    authState: { profile: {} },
    currentUser: { profile: {} },
    loading: true,
    login: () => {},
    logout: () => {}
});

const emptyAuthState = {
    token: null,
    userId: null,
    employeeId: null,
    name: null,
    role: null,
    permissions: [],
    mustChangePassword: false,
    profile: {},
};

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: null,
        userId: null,
        employeeId: null,
        name: null,
        role: null,
        permissions: [],
        mustChangePassword: false,
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

    const syncAuthFromStorage = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const name = localStorage.getItem('name') || sessionStorage.getItem('name');
        const role = localStorage.getItem('role') || sessionStorage.getItem('role');
        const mustChangePassword = (localStorage.getItem('mustChangePassword') || sessionStorage.getItem('mustChangePassword')) === 'true';
        const permissions = readStoredPermissions();

        if (token && employeeId) {
            setAuthState({
                token,
                userId,
                employeeId,
                name,
                role,
                permissions,
                mustChangePassword,
                profile: {}, 
            });
        } else {
            setAuthState(emptyAuthState);
        }
    };

    useEffect(() => {
        syncAuthFromStorage();
        setLoading(false);

        const handleAuthStateRefresh = () => syncAuthFromStorage();
        window.addEventListener('pageshow', handleAuthStateRefresh);
        window.addEventListener('focus', handleAuthStateRefresh);
        window.addEventListener('storage', handleAuthStateRefresh);

        return () => {
            window.removeEventListener('pageshow', handleAuthStateRefresh);
            window.removeEventListener('focus', handleAuthStateRefresh);
            window.removeEventListener('storage', handleAuthStateRefresh);
        };
    }, []);

    const login = (userId, token, employeeId, name, remember, role, permissions = [], mustChangePassword = false) => {
        const storage = remember ? localStorage : sessionStorage;
        
        storage.setItem('token', token);
        storage.setItem('employeeId', employeeId);
        storage.setItem('userId', userId);
        storage.setItem('name', name);
        storage.setItem('role', role);
        storage.setItem('permissions', JSON.stringify(permissions));
        storage.setItem('mustChangePassword', String(Boolean(mustChangePassword)));

        setAuthState({ 
            token, 
            userId, 
            employeeId, 
            name, 
            role, 
            permissions,
            mustChangePassword: Boolean(mustChangePassword),
            profile: {} 
        });
    };

    const markPasswordChanged = () => {
        localStorage.setItem('mustChangePassword', 'false');
        sessionStorage.setItem('mustChangePassword', 'false');
        setAuthState((current) => ({
            ...current,
            mustChangePassword: false,
        }));
    };

    const logout = () => {
        localStorage.clear();
        sessionStorage.clear();
        setAuthState(emptyAuthState);
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
            markPasswordChanged,
            logout,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
};
