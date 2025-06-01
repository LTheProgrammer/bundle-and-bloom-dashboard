// AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext();

// Fonction utilitaire pour gérer le token axios
const setAuthToken = (token) => {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common['Authorization'];
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const isTokenExpired = (token) => {
        try {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            return decoded.exp < currentTime;
        } catch {
            return true;
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            if (isTokenExpired(token)) {
                // Token expiré, déconnecter
                logout();
            } else {
                try {
                    const decoded = jwtDecode(token);
                    setUser(decoded);
                    setPermissions(decoded.permissions || []);
                    setAuthToken(token);
                } catch (error) {
                    localStorage.removeItem('token');
                    setAuthToken(null);
                    console.error(error);
                }
            }
        }
        setIsLoading(false);
    }, []);

    // Intercepteur axios pour gérer les erreurs de token expiré
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const hasPermission = (permission) => {
        return permissions.includes(permission);
    };

    const hasAnyPermission = (permissionList) => {
        return permissionList.some(p => permissions.includes(p));
    };

    const login = async (email, password) => {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur de connexion');
        }

        const data = await response.json();
        const { token } = data;

        // Stocker le token
        localStorage.setItem('token', token);

        // Configurer axios avec le nouveau token
        setAuthToken(token);

        // Décoder et stocker les infos utilisateur
        const decoded = jwtDecode(token);
        setUser(decoded);
        setPermissions(decoded.permissions || []);
        navigate('/');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAuthToken(null);
        setUser(null);
        setPermissions([]);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{
            user,
            permissions,
            isLoading,
            hasPermission,
            hasAnyPermission,
            login,
            logout,
            setUser,
            setPermissions
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);