import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Interceptor para tratar erros globais ou refresh token no futuro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@DigitalSignage:token');
      localStorage.removeItem('@DigitalSignage:user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
