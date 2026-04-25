import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storagedUser = localStorage.getItem('@DigitalSignage:user');
    const storagedToken = localStorage.getItem('@DigitalSignage:token');

    if (storagedUser && storagedToken) {
      setUser(JSON.parse(storagedUser));
      api.defaults.headers.Authorization = `Bearer ${storagedToken}`;
    }
    
    setLoading(false);
  }, []);

  async function login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { user, token } = response.data;

      localStorage.setItem('@DigitalSignage:user', JSON.stringify(user));
      localStorage.setItem('@DigitalSignage:token', token);

      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao realizar login' 
      };
    }
  }

  function logout() {
    localStorage.removeItem('@DigitalSignage:user');
    localStorage.removeItem('@DigitalSignage:token');
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
