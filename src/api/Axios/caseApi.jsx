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
                localStorage.removeItem('refreshToken'); // Fixed typo: removeToken -> removeItem
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

    getCase: (identifier) => {
        // Handle case numbers with slashes by properly encoding them
        if (typeof identifier === 'string' && identifier.includes('/')) {
            // Single encode the case number - the browser will handle the rest
            const encodedCaseNum = encodeURIComponent(identifier);
            console.log('Original case number:', identifier);
            console.log('Encoded case number:', encodedCaseNum);
            return caseApi.get(`/api/cases/caseNum/${encodedCaseNum}`);
        }
        // Handle numeric IDs
        return caseApi.get(`/api/cases/${identifier}`);
    },

    updateCaseStatus: (id, status) => {
        return caseApi.patch(`/api/cases/${id}/status`, { status });
    },

    deleteCase: (id) => {
        return caseApi.delete(`/api/cases/${id}`);
    }
};

export const ReportApi = {
    submitReport: async (formData, employeeId) => {
        try {
            const response = await axios.post(
                `${BASE_URL}/api/reports`, // Correct endpoint
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'employee_id': employeeId, // Add employee_id header
                        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}` // Add auth token
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error submitting report:', error);
            throw error;
        }
    },

    getMyReports: () => {
        return caseApi.get('/api/reports/my-reports');
    },

    getReport: (id) => {
        return caseApi.get(`/api/reports/${id}`);
    },

    createReport: (data) => caseApi.post('/api/reports', data),

    sendToDirectorIntelligence: (reportId) => {
        console.log('Sending report to Director of Intelligence:', reportId);
        return caseApi.post(`/api/reports/${reportId}/send-to-director-intelligence`, {});
    },

    sendToCommissioner: (id) => {
        return caseApi.post(`/api/reports/${id}/send-to-commissioner-intelligence`, {});
    },

    sendToDirectorInvestigation: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/send-to-director-investigation`, {});
    },

    returnReport: (id, returnToEmployeeId) => {
        return caseApi.post(`/api/reports/${id}/return`, null, {
            params: { returnToEmployeeId }
        });
    },

    getReportsForDirectorIntelligence: () => {
        return caseApi.get('/api/reports/director-intelligence/reports');
    },

    getReportsForDirectorInvestigation: () => {
        return caseApi.get('/api/reports/director-investigation/approved-reports');
    },

    getReportsForAssistantCommissioner: () => {
        return caseApi.get('/api/reports/assistant-commissioner/approved-reports');
    },

    approveReport: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/approve`, {});
    },

    rejectReport: (reportId, rejectionReason) => {
        return caseApi.post(`/api/reports/${reportId}/reject`, null, {
            params: { rejectionReason }
        });
    }
};

export const CommissionerApi = {
    getCommissionerCases: () => {
        return caseApi.get('/api/commissioner/cases');
    },

    approveCase: (caseId) => {
        return caseApi.post(`/api/commissioner/cases/${caseId}/approve`);
    },

    rejectCase: (caseId, reason) => {
        return caseApi.post(`/api/commissioner/cases/${caseId}/reject`, { reason });
    }
};

export default caseApi;