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

export const CaseService = {
    getCasesByStatus: (status) => {
        return caseApi.get(`/api/cases/status/${status}`);
    },
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
    submitFindings: (reportId, formData) => {
        return caseApi.post(`/api/reports/${reportId}/submit-findings`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
    },

    approveInvestigationReport: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/approve-investigation-report`, {});
    },

    rejectInvestigationReport: (reportId, rejectionReason) => {
        return caseApi.post(`/api/reports/${reportId}/reject-investigation-report`,
            { rejectionReason }
        );
    },

    returnInvestigationReport: (reportId, returnReason) => {
        return caseApi.post(`/api/reports/${reportId}/return-investigation-report`,
            { returnReason }
        );
    },
    returnReportWithAttachment: async (reportId, returnToEmployeeId, returnReason, returnDocument) => {
        try {
            const formData = new FormData();

            // Add the file if provided
            if (returnDocument) {
                formData.append('returnDocument', returnDocument);
            }

            console.log('Sending return request:', {
                reportId,
                returnToEmployeeId,
                returnReason,
                hasFile: !!returnDocument
            });

            const response = await caseApi.post(
                `/api/reports/${reportId}/return-with-document`,  // Make sure reportId is a number/string, not FormData
                formData,
                {
                    params: {
                        returnToEmployeeId: returnToEmployeeId,
                        returnReason: returnReason || ''
                    },
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('API Error in returnReportWithAttachment:', error);
            throw error.response?.data || error.message;
        }
    },
    getAssignedReportsForInvestigationOfficer: () => {
        return caseApi.get('/api/reports/investigation-officer/assigned-reports');
    },

    // New method - gets all active reports
    getActiveReportsForInvestigationOfficer: () => {
        return caseApi.get('/api/reports/investigation-officer/active-reports');
    },

    // New method - gets all historical reports
    getAllReportsForInvestigationOfficer: () => {
        return caseApi.get('/api/reports/investigation-officer/all-reports');
    },
    submitCasePlan: async (reportId, formData) => {
        try {
            const response = await caseApi.post(
                `/api/reports/${reportId}/submit-case-plan`,
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
    },

    sendCasePlanToDirectorInvestigation: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/send-case-plan-to-director-investigation`, {});
    },

    getCasePlansForDirectorInvestigation: () => {
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        return caseApi.get('/api/reports/director-investigation/case-plans', {
            headers: { 'employee_id': employeeId }
        });
    },
    getCasePlan: (reportId) => {
        return caseApi.get(`/api/reports/${reportId}/case-plan`);
    },

    approveCasePlan: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/approve-case-plan`, {});
    },

    rejectCasePlan: (reportId, rejectionReason) => {
        return caseApi.post(`/api/reports/${reportId}/reject-case-plan`, null, {
            params: { rejectionReason }
        });
    },
    downloadReturnDocument: async (reportId) => {
        try {
            const response = await caseApi.get(`/api/reports/${reportId}/return-document`, {
                responseType: 'blob'
            });
            return response;
        } catch (error) {
            console.error("Error downloading return document", error);
            throw error;
        }
    },
    getEditPermission: (reportId) => {
        return caseApi.get(`/api/reports/${reportId}/edit-permission`);
    },

    editReport: (reportId, formData) => {
        return caseApi.put(`/api/reports/${reportId}/edit`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    getReportsAssignedToInvestigationOfficers: () => {
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        return caseApi.get('/api/reports/investigation-officers/assigned-reports', {
            params: { employeeId }
        });
    },
    getReportsByT3Officers: () => {
        return caseApi.get('/api/reports/t3-officers-reports');
    },
    getFinesReportForAssistantCommissioner: () => {
        return caseApi.get('/api/reports/assistant-commissioner/fines-report');
    },
    getPenaltiesReportForAssistantCommissioner: () => {
        return caseApi.get('/api/reports/assistant-commissioner/penalties-report');
    },
    updateReturnedReport: (reportId, reportData) => {
        return caseApi.put(`/api/reports/${reportId}/update-returned-report`, reportData);
    },
    getFindings: (reportId) => {
        return caseApi.get(`/api/reports/${reportId}/findings`);
    },

    downloadFindingsAttachment: async (reportId, filename) => {
        try {
            const response = await caseApi.get(
                `/api/reports/${reportId}/findings-attachments/by-name/${encodeURIComponent(filename)}`,
                { responseType: 'blob' }
            );

            // trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error downloading findings file by name", err);
            throw err;
        }
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

    assignToInvestigationOfficer: (reportId, officerId, assignmentNotes) => {
        return caseApi.post(`/api/reports/${reportId}/assign-to-investigation-officer`, {
            specificOfficerId: officerId,
            assignmentNotes: assignmentNotes
        });
    },
    getCasePlansForAssistantCommissioner: () => {
        return caseApi.get('/api/reports/assistant-commissioner/case-plans');
    },

    getCasePlanDetails: (reportId) => {
        return caseApi.get(`/api/reports/${reportId}/case-plan`);
    },

    approveCasePlanByAssistantCommissioner: (reportId, comments = '') => {
        return caseApi.post(`/api/reports/${reportId}/approve-case-plan-assistant-commissioner`,
            { comments },
            { params: { comments } }
        );
    },

    rejectCasePlanByAssistantCommissioner: (reportId, rejectionReason) => {
        return caseApi.post(`/api/reports/${reportId}/reject-case-plan-assistant-commissioner`,
            null,
            { params: { rejectionReason } }
        );
    },

    updateInvestigationStatus: (caseId, status, notes) => {
        return caseApi.patch(`/api/reports/${caseId}/investigation-status`, {
            status,
            notes
        });
    },

    downloadAttachment: async (reportId, storedFilename) => {
        try {
            const requesterId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

            const response = await caseApi.get(
                `/api/reports/download/${reportId}/${storedFilename}`,
                {
                    params: { requesterId },
                    responseType: 'blob'
                }
            );

            // Create a link to trigger browser download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from header
            let filename = 'attachment.pdf';
            const disposition = response.headers['content-disposition'];
            if (disposition) {
                const match = disposition.match(/filename="?(.+)"?/);
                if (match) {
                    filename = match[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading attachment", error);
            throw error;
        }
    },
    getDepartments: () => {
        return caseApi.get('/api/departments');
    },
    sendReport: (reportId, departmentName) => {
        return caseApi.post(`/api/reports/${reportId}/send`, {
            Department: departmentName
        });
    },
    sendReportToLegalAdvisor: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/send-to-legal-advisor`, {}).catch(err => {
            console.error(`Failed to send report ${reportId} to Legal Advisor:`, err);
            throw err;
        });
    },
    getReportsForLegalAdvisor: () => {
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');
        return caseApi.get('/api/reports/legal-advisor/my-reports', {
            headers: { 'employee_id': employeeId }
        });
    },
    getAllReportsWithLegalAdvisors: () => {
        return caseApi.get('/api/reports/legal-advisor/all-reports');
    },
    getAvailableInvestigationOfficers: () => {
        return caseApi.get('/api/reports/investigation-officers');
    },
};

export const InvestigationApi = {
    getAvailableOfficers: () => {
        return caseApi.get('/api/reports/investigation-officers');
    },
};
export const AuditApi = {
    getAuditLogs: () => {
        return caseApi.get('/api/audit/audit-logs');
    }
};

export default caseApi;