import axios from 'axios';

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:2005',
});

// List of endpoints that don't require authentication
const UNAUTHENTICATED_ENDPOINTS = [
    '/login',
    '/register',
    '/forgot-password',
    '/verify-otp',
    '/reset-password',
    '/api/auth/refresh'
];

instance.interceptors.request.use(
    (config) => {
        // Skip auth for unauthenticated endpoints
        // Use exact path matching to avoid catching sub-paths like /admin/register-user
        const path = (config.url || '').split('?')[0].toLowerCase();
        const isUnauthenticated = UNAUTHENTICATED_ENDPOINTS.some(endpoint => 
            path === endpoint.toLowerCase() || path.endsWith(endpoint.toLowerCase())
        );

        if (isUnauthenticated) {
            const newConfig = { ...config };
            delete newConfig.headers.Authorization;
            return newConfig;
        }

        // Add auth token for other requests
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

instance.interceptors.response.use(
    (response) => {
        // You can add any response transformation here if needed
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Log error for debugging safely
        let errorMessage = error.message;
        if (error.response?.data) {
            if (typeof error.response.data === 'string') {
                errorMessage = error.response.data;
            } else if (error.response.data.message) {
                errorMessage = error.response.data.message;
            }
        }

        console.error('API Error:', {
            url: originalRequest.url,
            status: error.response?.status,
            message: errorMessage
        });

        // Handle 401 Unauthorized (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
            
            if (!refreshToken) {
                // No refresh token, just fail the request - don't force redirect here
                return Promise.reject(error);
            }

            try {
                const response = await instance.post('/api/auth/refresh', { refreshToken });
                const { token, employeeId } = response.data;

                const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
                storage.setItem('token', token);
                if (employeeId) storage.setItem('employeeId', employeeId);

                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return instance(originalRequest);
            } catch (refreshError) {
                // If refresh fails, then we can consider redirecting
                console.error('Session expired, please login again.');
                return Promise.reject(refreshError);
            }
        }

        // For all other errors, pass them through
        return Promise.reject(error);
    }
);

export default instance;