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
        const path = config.url.split('?')[0];
        const isUnauthenticated = UNAUTHENTICATED_ENDPOINTS.some(endpoint => 
            path === endpoint || path.endsWith(endpoint)
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

        // Add employee ID if available
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        if (employeeId) {
            config.headers['employee_id'] = employeeId.trim();
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

        // Log error for debugging
        console.error('API Error:', {
            url: originalRequest.url,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });

        // Handle 401 Unauthorized (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await axios.post(`${instance.defaults.baseURL}/api/auth/refresh`, {
                    refreshToken
                });

                const { token, employeeId } = response.data;

                // Store the new token
                if (localStorage.getItem('token')) {
                    localStorage.setItem('token', token);
                    localStorage.setItem('employeeId', employeeId);
                } else {
                    sessionStorage.setItem('token', token);
                    sessionStorage.setItem('employeeId', employeeId);
                }

                // Retry the original request with new token
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                originalRequest.headers['employee_id'] = employeeId;
                return instance(originalRequest);
            } catch (refreshError) {
                // If refresh fails, clear storage and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('employeeId');
                localStorage.removeItem('refreshToken');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('employeeId');
                sessionStorage.removeItem('refreshToken');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }

        // For all other errors, pass them through
        return Promise.reject(error);
    }
);

export default instance;