import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://midiamais.up.railway.app/api',
});

// Interceptor para tratar erros globais ou refresh token no futuro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpa apenas token e user da sessão, MAS preserva credenciais de remember
      // para que o auto-login funcione na próxima abertura do app
      localStorage.removeItem('@DigitalSignage:token');
      localStorage.removeItem('@DigitalSignage:user');
      
      // Tenta remover token/user das Preferences nativas (sessão)
      import('@capacitor/preferences').then(({ Preferences }) => {
        Promise.all([
          Preferences.remove({ key: '@DigitalSignage:user' }),
          Preferences.remove({ key: '@DigitalSignage:token' })
        ]).finally(() => {
          // Só redireciona se não estiver já na tela de login
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        });
      }).catch(() => {
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      });
    }
    return Promise.reject(error);
  }
);

export default api;
