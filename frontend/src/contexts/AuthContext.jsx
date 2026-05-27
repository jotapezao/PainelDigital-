import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { Preferences } from '@capacitor/preferences';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorage() {
      let storagedUser = null;
      let storagedToken = null;

      try {
        const { value: prefUser } = await Preferences.get({ key: '@DigitalSignage:user' });
        const { value: prefToken } = await Preferences.get({ key: '@DigitalSignage:token' });
        storagedUser = prefUser;
        storagedToken = prefToken;
      } catch (e) {
        console.error('Falha ao ler Preferences nativo:', e);
      }

      // Fallback para localStorage
      if (!storagedUser) {
        storagedUser = localStorage.getItem('@DigitalSignage:user');
      }
      if (!storagedToken) {
        storagedToken = localStorage.getItem('@DigitalSignage:token');
      }

      if (storagedUser && storagedToken) {
        try {
          const parsedUser = JSON.parse(storagedUser);
          if (parsedUser) {
            setUser(parsedUser);
            api.defaults.headers.Authorization = `Bearer ${storagedToken}`;
          } else {
            await logout();
          }
        } catch (e) {
          console.error('Falha ao restaurar sessão:', e);
          await logout();
        }
      }
      setLoading(false);
    }

    loadStorage();
  }, []);

  async function login(loginIdentifier, password, remember = false) {
    try {
      const response = await api.post('/auth/login', { login: loginIdentifier, password });
      
      const { user, token } = response.data;

      if (!user || !token) {
        throw new Error('Dados de autenticação inválidos recebidos do servidor');
      }

      // Persiste no Preferences para Android TV (salvo indefinidamente)
      try {
        await Preferences.set({ key: '@DigitalSignage:user', value: JSON.stringify(user) });
        await Preferences.set({ key: '@DigitalSignage:token', value: token });
      } catch (e) {
        console.error('Falha ao salvar no Preferences nativo:', e);
      }

      // Também persiste no localStorage por redundância
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

  async function logout() {
    try {
      await Preferences.remove({ key: '@DigitalSignage:user' });
      await Preferences.remove({ key: '@DigitalSignage:token' });
    } catch (e) {
      console.error('Falha ao remover do Preferences nativo:', e);
    }

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
