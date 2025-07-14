import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: null,
        userId: null,
        employeeId: null,
        name: null  // Add name to the auth state
    });

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const name = localStorage.getItem('name') || sessionStorage.getItem('name');  // Get name from storage

        if (token && employeeId) {
            setAuthState({
                token,
                userId,
                employeeId,
                name  // Include name in the state
            });
        }
    }, []);

    const login = (userId, token, employeeId, name, remember) => {  // Add name parameter
        if (remember) {
            localStorage.setItem('token', token);
            localStorage.setItem('employeeId', employeeId);
            localStorage.setItem('userId', userId);
            localStorage.setItem('name', name);  // Store name
        } else {
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('employeeId', employeeId);
            sessionStorage.setItem('userId', userId);
            sessionStorage.setItem('name', name);  // Store name
        }
        setAuthState({ token, userId, employeeId, name });  // Include name in state
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
            currentUser: authState,  // Add currentUser alias for easier access
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};