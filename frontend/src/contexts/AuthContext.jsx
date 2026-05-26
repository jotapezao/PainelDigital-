import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sempre lê do localStorage — sessionStorage é destruído ao fechar o APK/WebView
    const storagedUser = localStorage.getItem('@DigitalSignage:user');
    const storagedToken = localStorage.getItem('@DigitalSignage:token');

    if (storagedUser && storagedToken) {
      try {
        const parsedUser = JSON.parse(storagedUser);
        if (parsedUser) {
          setUser(parsedUser);
          api.defaults.headers.Authorization = `Bearer ${storagedToken}`;
        } else {
          logout();
        }
      } catch (e) {
        console.error('Falha ao restaurar sessão:', e);
        logout();
      }
    }
    
    setLoading(false);
  }, []);

  async function login(loginIdentifier, password, remember = false) {
    try {
      const response = await api.post('/auth/login', { login: loginIdentifier, password });
      
      const { user, token } = response.data;

      if (!user || !token) {
        throw new Error('Dados de autenticação inválidos recebidos do servidor');
      }

      // Sempre persiste no localStorage para sobreviver a reinicializações do APK/WebView
      localStorage.setItem('@DigitalSignage:user', JSON.stringify(user));
      localStorage.setItem('@DigitalSignage:token', token);

      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Erro ao realizar login' 
      };
    }
  }

  function logout() {
    localStorage.removeItem('@DigitalSignage:user');
    localStorage.removeItem('@DigitalSignage:token');
    // Limpa sessionStorage também por legado
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
