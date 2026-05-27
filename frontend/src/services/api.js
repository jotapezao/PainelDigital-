import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://midiamais.up.railway.app/api',
});

// Interceptor para tratar erros globais ou refresh token no futuro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@DigitalSignage:token');
      localStorage.removeItem('@DigitalSignage:user');
      
      // Tenta remover as credenciais das Preferences nativas e depois redireciona
      import('@capacitor/preferences').then(({ Preferences }) => {
        Promise.all([
          Preferences.remove({ key: '@DigitalSignage:user' }),
          Preferences.remove({ key: '@DigitalSignage:token' })
        ]).finally(() => {
          window.location.href = '/login';
        });
      }).catch(() => {
        window.location.href = '/login';
      });
    }
    return Promise.reject(error);
  }
);

export default api;
