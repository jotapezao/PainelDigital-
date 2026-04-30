import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storagedUser = localStorage.getItem('@DigitalSignage:user') || sessionStorage.getItem('@DigitalSignage:user');
    const storagedToken = localStorage.getItem('@DigitalSignage:token') || sessionStorage.getItem('@DigitalSignage:token');

    if (storagedUser && storagedToken) {
      setUser(JSON.parse(storagedUser));
      api.defaults.headers.Authorization = `Bearer ${storagedToken}`;
    }
    
    setLoading(false);
  }, []);

  async function login(loginIdentifier, password, remember = false) {
    try {
      const response = await api.post('/auth/login', { login: loginIdentifier, password });
      
      const { user, token } = response.data;

      const storage = remember ? localStorage : sessionStorage;

      storage.setItem('@DigitalSignage:user', JSON.stringify(user));
      storage.setItem('@DigitalSignage:token', token);

      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || error.response?.data?.message || 'Erro ao realizar login' 
      };
    }
  }

  function logout() {
    localStorage.removeItem('@DigitalSignage:user');
    localStorage.removeItem('@DigitalSignage:token');
    sessionStorage.removeItem('@DigitalSignage:user');
    sessionStorage.removeItem('@DigitalSignage:token');
    api.defaults.headers.Authorization = undefined;
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
