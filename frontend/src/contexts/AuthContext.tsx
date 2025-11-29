import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'employee' | 'viewer';
  two_fa_enabled: boolean;
}

interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, tfaCode?: string) => Promise<LoginResult>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  requires2FA: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    // Remove any base URL so API calls go through nginx proxy
    delete axios.defaults.baseURL;
    
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/api/auth/me');
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setInitialized(true);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string, tfaCode?: string): Promise<LoginResult> => {
    try {
      setError(null);
      setLoading(true);

      const response = await axios.post('/api/auth/login', {
        username,
        password,
        twoFAToken: tfaCode
      });

      console.log('Login response:', response.data); // Debug log
      
      const { token, user: userData } = response.data;
      
      if (!token || !userData) {
        throw new Error('Risposta del server incompleta');
      }
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error object:', error);
      console.error('Response status:', error.response?.status);
      
      const errorMessage = error.response?.data?.error || error.message || 'Errore di accesso';
      const is402 = error.response?.status === 402;
      const has2FAFlag = error.response?.data?.requires2FA === true;
      const is2FAMessage = typeof errorMessage === 'string' && errorMessage.includes('2FA');
      
      const requires2FA = is402 || has2FAFlag || is2FAMessage;
      
      console.log('2FA Detection:', { is402, has2FAFlag, is2FAMessage, requires2FA });

      if (!requires2FA) {
        setError(errorMessage);
        setRequires2FA(false);
      } else {
        // If 2FA is required, we don't want to show a generic error
        setError(null);
        setRequires2FA(true);
      }

      return { 
        success: false, 
        error: errorMessage,
        requires2FA
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    error,
    initialized,
    requires2FA
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
