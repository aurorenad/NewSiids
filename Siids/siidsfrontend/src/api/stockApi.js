import axios from './axios';

export const stockApi = {
    // TEMPORARY STOCK
    getTemporaryStock: () => axios.get('/api/stock/temporary'),
    getSeizureHistory: () => axios.get('/api/stock/temporary/history'),
    getNextReference: () => axios.get('/api/stock/temporary/next-reference'),
    createSeizureNote: (data) => axios.post('/api/stock/temporary/seizure-notes', data),
    updateSeizureNote: (id, data) => axios.put(`/api/stock/temporary/seizure-notes/${id}`, data),
    releaseFromTemp: (id, data) => axios.post(`/api/stock/temporary/${id}/release`, data),
    escalateToMain: (id, data) => axios.post(`/api/stock/temporary/${id}/escalate`, data),
    downloadSeizureNote: (id) => axios.get(`/api/stock/temporary/${id}/seizure-note`, { responseType: 'blob' }),

    // MAIN STOCK
    getMainStock: () => axios.get('/api/stock/main'),
    downloadPVPdf: (id) => axios.get(`/api/stock/main/${id}/pv-pdf`, { responseType: 'blob' }),
    requestRelease: (id, data) => axios.post(`/api/stock/main/${id}/release-notes`, data),
    returnForCorrection: (id, reason) => axios.post(`/api/stock/main/${id}/return-for-correction`, { reason }),

    // PRSO APPROVALS
    getPendingApprovals: () => axios.get('/api/stock/main/pending-approvals'),
    getApprovalHistory: () => axios.get('/api/stock/main/approval-history'),
    approveRelease: (id) => axios.post(`/api/stock/main/release-notes/${id}/approve`),
    rejectRelease: (id, reason) => axios.post(`/api/stock/main/release-notes/${id}/reject`, { reason }),
    downloadReleaseNotePdf: (id) => axios.get(`/api/stock/main/release-notes/${id}/pdf`, { responseType: 'blob' }),
    previewReleaseNotePdf: (data) => axios.post(`/api/stock/main/release-notes/preview`, data, { responseType: 'blob' }),
};
