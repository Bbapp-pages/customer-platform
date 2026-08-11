import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Un 401 en /auth/login o /auth/register es un error de validación normal
// (credenciales o código incorrectos) que la propia página ya muestra — no
// significa que una sesión existente haya expirado, así que no debe disparar
// la redirección forzada a /login.
const isAuthEndpoint = (url) =>
  ['/auth/login', '/auth/register'].some((path) => url?.includes(path));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      localStorage.removeItem('adminToken');

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
