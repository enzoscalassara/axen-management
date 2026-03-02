import axios from 'axios';

/** Cliente HTTP configurado para a API FastAPI */
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Interceptor que injeta o token JWT e o empresa_id em cada requisição.
 * O token vem do localStorage (setado após login com Supabase Auth).
 * O empresa_id vem do contexto da empresa selecionada.
 */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('axen_token');
    const empresaId = localStorage.getItem('axen_empresa_id');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (empresaId) {
        config.headers['X-Empresa-Id'] = empresaId;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('axen_token');
            localStorage.removeItem('axen_empresa_id');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
