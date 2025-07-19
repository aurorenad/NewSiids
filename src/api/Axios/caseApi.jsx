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

const submitFindings = async (reportId, formData) => {
    try {
        const response = await caseApi.post(
            `/api/reports/${reportId}/submit-findings`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

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
        if (typeof identifier === 'string' && identifier.includes('/')) {
            return caseApi.get(`/api/cases/caseNum/${identifier}`);
        }
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
    submitFindings,
    getFindings: (reportId) => {
        return caseApi.get(`/api/reports/${reportId}/findings`);
    },

    downloadFindingsAttachment: (reportId, attachmentIndex) => {
        return caseApi.get(
            `/api/reports/${reportId}/findings-attachments/${attachmentIndex}`,
            { responseType: 'blob' }
        );
    },
    submitReport: async (formData, employeeId) => {
        try {
            const response = await caseApi.post(
                '/api/reports',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'employee_id': employeeId
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error submitting report:', error);
            throw error;
        }
    },

    getReport: (id) => {
        return caseApi.get(`/api/reports/${id}`);
    },

    sendToDirectorIntelligence: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/send-to-director-intelligence`, {});
    },

    returnReport: (id, returnToEmployeeId, returnReason) => {
        return caseApi.post(`/api/reports/${id}/return`, null, {
            params: {
                returnToEmployeeId,
                returnReason
            }
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
    },

    assignToInvestigationOfficer: (reportId, officerId) => {
        return caseApi.post(`/api/reports/${reportId}/assign-to-investigation-officer`, {
            specificOfficerId: officerId
        });
    },

    getAssignedReportsForInvestigationOfficer: () => {
        return caseApi.get('/api/reports/investigation-officer/assigned-reports');
    },

    updateInvestigationStatus: (caseId, status, notes) => {
        return caseApi.patch(`/api/investigation/cases/${caseId}/status`, {
            status,
            notes
        });
    },

    downloadAttachment: async (reportId) => {
        try {
            const response = await caseApi.get(
                `/api/reports/${reportId}/attachment`,
                {
                    responseType: 'blob' // Important for file downloads
                }
            );

            // Create a download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Get filename from response headers or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'attachment';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return response;
        } catch (error) {
            console.error('Error downloading attachment:', error);
            throw error;
        }
    },
};

export const InvestigationApi = {
    getAvailableOfficers: () => {
        return caseApi.get('/api/reports/investigation-officers');
    },
};

export default caseApi;