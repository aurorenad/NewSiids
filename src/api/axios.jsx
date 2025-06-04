import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:8080',
});

instance.interceptors.request.use(
    (config) => {
        if (config.url.includes('/') || config.url.includes('/register')) {
            const newConfig = { ...config };
            delete newConfig.headers.Authorization;
            return newConfig;
        }

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;