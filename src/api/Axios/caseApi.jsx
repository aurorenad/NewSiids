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
                window.location.href = '/';
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

export const ReportApi = {
    submitReport: (formData, caseId) => {
        return caseApi.post('/api/reports', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            params: {
                caseId: caseId
            }
        });
    },

    getMyReports: () => {
        return caseApi.get('/api/reports/my-reports');
    },

    getReport: (id) => {
        return caseApi.get(`/api/reports/${id}`);
    },

    sendToDirectorIntelligence: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/send-to-director-intelligence`, {
            headers: {
                'Employee-Id': localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId')
            }
        });
    },

    sendToCommissioner: (id) => {
        return caseApi.post(`/api/reports/${id}/send-to-commissioner`,{
            headers: {
                'Employee-Id': localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId')
            }
        });
    },
    sendToDirectorInvestigation: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/send-to-director-intelligence`, {
            headers: {
                'Employee-Id': localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId')
            }
        });
    },
    returnReport: (id, returnToEmployeeId) => {
        return caseApi.post(`/api/reports/${id}/return`, null, {
            params: { returnToEmployeeId }
        });
    },
    getReportsForDirectorIntelligence: () => {
        return caseApi.get('/api/reports/director-intelligence/reports');
    },
};

export default caseApi;