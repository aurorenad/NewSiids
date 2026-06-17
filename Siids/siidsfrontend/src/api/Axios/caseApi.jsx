import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:2005';

const caseApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000,
});

const getFilenameFromDisposition = (disposition, fallback) => {
    if (!disposition) return fallback;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
    }
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
    return filenameMatch?.[1] || fallback;
};

const downloadBlob = (response, fallbackFilename) => {
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = getFilenameFromDisposition(response.headers?.['content-disposition'], fallbackFilename);

    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 1000);
};

caseApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Removed employee_id header dependency
    return config;
}, (error) => Promise.reject(error));

caseApi.interceptors.response.use(
    (response) => {
        // console.log('Response received:', response.data);
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

    updateCase: (id, caseData) => {
        return caseApi.put(`/api/cases/${id}`, {
            ...caseData,
            status: caseData.status || 'CASE_CREATED'
        });
    },

    getMyCases: (params = {}) => {
        return caseApi.get('/api/cases', { params });
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
    },
    
    findTaxPayerByTIN: (tin) => {
        return caseApi.get(`/api/taxpayers/tin/${tin}`);
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
    returnReportWithAttachment: async (reportId, returnToEmployeeId, returnReason, returnDocument, options = {}) => {
        const formData = new FormData();

        // Add the file if provided
        if (returnDocument) {
            formData.append('returnDocument', returnDocument);
        }

        const response = await caseApi.post(
            `/api/reports/${reportId}/return-with-document`,  // Make sure reportId is a number/string, not FormData
            formData,
            {
                params: {
                    returnToEmployeeId,
                    ...(returnReason ? { returnReason } : {})
                },
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                ...options
            }
        );
        return response.data;
    },
    receiveCase: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/receive-case`, {});
    },
    getAssignedReportsForInvestigationOfficer: () => {
        return caseApi.get('/api/reports/investigation-officer/assigned-reports');
    },

    // New method - gets all active reports
    getActiveReportsForInvestigationOfficer: (params = {}) => {
        return caseApi.get('/api/reports/investigation-officer/active-reports', { params });
    },

    // New method - gets all historical reports
    getAllReportsForInvestigationOfficer: (params = {}) => {
        return caseApi.get('/api/reports/investigation-officer/all-reports', { params });
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

    sendCasePlanToAssistantCommissioner: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/send-case-plan-to-assistant-commissioner`, {});
    },

    getCasePlansForDirectorInvestigation: () => {
        return caseApi.get('/api/reports/director-investigation/case-plans');
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
    checkEditPermission: (reportId) => {
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
            return await caseApi.get(`/api/reports/${reportId}/attachments`, {
                responseType: 'blob',
                params: { filename },
            });
        } catch (err) {
            console.error("Error downloading findings file", err);
            throw err;
        }
    },

    submitReport: async (formData) => {
        try {
            const response = await caseApi.post(
                '/api/reports',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
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

    getReportsForDirectorIntelligence: (params = {}) => {
        return caseApi.get('/api/reports/director-intelligence/reports', { params });
    },

    getReportsForDirectorInvestigation: (params = {}) => {
        return caseApi.get('/api/reports/director-investigation/approved-reports', { params });
    },

    getReportsForAssistantCommissioner: (params = {}) => {
        return caseApi.get('/api/reports/assistant-commissioner/approved-reports', { params });
    },

    getAllReportsForAssistantCommissioner: () => {
        return caseApi.get('/api/reports/assistant-commissioner/all-reports');
    },

    approveReport: (reportId) => {
        return caseApi.post(`/api/reports/${reportId}/approve`, {});
    },

    approveReportByAssistantCommissioner: (reportId, routeDepartment, signatureBase64, routingNotes = '') => {
        return caseApi.post(`/api/reports/${reportId}/approve-assistant-commissioner`, {
            routeDepartment,
            signatureBase64,
            routingNotes
        });
    },

    rejectReport: (reportId, rejectionReason) => {
        return caseApi.post(`/api/reports/${reportId}/reject`, null, {
            params: { rejectionReason }
        });
    },

    signReport: (reportId, signatureBase64, role) => {
        return caseApi.post(`/api/reports/${reportId}/sign`, {
            signatureBase64,
            role
        });
    },

    downloadInvestigationReportPdf: (reportId) => {
        return caseApi.get(`/api/reports/${reportId}/investigation-report-pdf`, {
            responseType: 'blob'
        });
    },

    returnToAssistantCommissioner: (reportId, returnReason) => {
        return caseApi.post(`/api/reports/${reportId}/return-to-assistant-commissioner`, {
            returnReason
        });
    },

    assignToInvestigationOfficer: (reportId, officerId, assignmentNotes) => {
        return caseApi.post(`/api/reports/${reportId}/assign-to-investigation-officer`, {
            specificOfficerId: officerId,
            assignmentNotes: assignmentNotes
        });
    },
    getCasePlansForAssistantCommissioner: (params = {}) => {
        return caseApi.get('/api/reports/assistant-commissioner/case-plans', { params });
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

    downloadAttachment: async (reportId, filename) => {
        const url = `/api/reports/${reportId}/attachments?filename=${encodeURIComponent(filename)}`;
        const response = await caseApi.get(url, { responseType: 'blob' });
        downloadBlob(response, filename);
    },
    viewAttachment: async (reportId, filename) => {
        const response = await caseApi.get(
            `/api/reports/${reportId}/attachments`,
            {
                params: {
                    filename,
                    inline: true,
                },
                responseType: 'blob'
            }
        );

        const fileURL = window.URL.createObjectURL(
            new Blob([response.data], {
                type: response.headers?.['content-type'] || 'application/pdf'
            })
        );

        window.open(fileURL, '_blank', 'noopener,noreferrer');
        return fileURL;
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
    getReportsForLegalAdvisor: (params = {}) => {
        return caseApi.get('/api/reports/legal-advisor/my-reports', { params });
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
    getAuditLogs: (params = {}) => {
        return caseApi.get('/api/audit/audit-logs', { params });
    },
    getAuditActions: () => {
        return caseApi.get('/api/audit/audit-actions');
    }
};


export default caseApi;
