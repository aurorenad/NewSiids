import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const caseApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000,
});

caseApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (employeeId) {
        config.headers['employee_id'] = employeeId.trim();
    }

    console.log('Request headers:', config.headers);
    return config;
}, (error) => Promise.reject(error));

caseApi.interceptors.response.use(
    (response) => {
        console.log('Response received:', response.data);
        return response;
    },
    async (error) => {
        console.error('Response error:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
            try {
                const response = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
                const { token, employeeId } = response.data;

                // Store the new token and employee ID in the same storage as original login
                if (localStorage.getItem('token')) {
                    localStorage.setItem('token', token);
                    localStorage.setItem('employeeId', employeeId);
                } else {
                    sessionStorage.setItem('token', token);
                    sessionStorage.setItem('employeeId', employeeId);
                }

                error.config.headers['Authorization'] = `Bearer ${token}`;
                error.config.headers['employee_id'] = employeeId;
                return caseApi.request(error.config);
            } catch (refreshError) {
                // Clear all auth storage if refresh fails
                localStorage.removeItem('token');
                localStorage.removeItem('employeeId');
                localStorage.removeItem('refreshToken');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('employeeId');
                sessionStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const CaseService = {
    createCase: (caseData) => {
        return caseApi.post('/api/cases', {
            ...caseData,
            status: caseData.status || 'CASE_CREATED'
        });
    },

    getMyCases: () => {
        return caseApi.get('/api/cases');
    },

    getCase: (id) => {
        return caseApi.get(`/api/cases/${id}`);
    },

    updateCaseStatus: (id, status) => {
        return caseApi.patch(`/api/cases/${id}/status`, { status });
    },

    deleteCase: (id) => {
        return caseApi.delete(`/api/cases/${id}`);
    }
};

export default caseApi;