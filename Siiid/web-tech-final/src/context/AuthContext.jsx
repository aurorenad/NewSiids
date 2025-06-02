import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(null);

    const login = (userId, jwtToken, remember = false) => {
        setCurrentUser(userId);
        setToken(jwtToken);

        if (remember) {
            localStorage.setItem('token', jwtToken);
            localStorage.setItem('userId', userId);
        } else {
            sessionStorage.setItem('token', jwtToken);
            sessionStorage.setItem('userId', userId);
        }
    };

    const logout = () => {
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userId');
    };

    React.useEffect(() => {
        const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
        const storedUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (storedToken && storedUserId) {
            setCurrentUser(storedUserId);
            setToken(storedToken);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };