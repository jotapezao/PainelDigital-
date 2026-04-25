import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// Interceptor para tratar erros globais ou refresh token no futuro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Opcional: deslogar usuário se o token expirar
      // localStorage.removeItem('@DigitalSignage:token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
