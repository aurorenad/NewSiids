import axios from './axios';

export const stockApi = {
    // TEMPORARY STOCK
    getTemporaryStock: () => axios.get('/api/stock/temporary'),
    getSeizureHistory: () => axios.get('/api/stock/temporary/history'),
    createSeizureNote: (data) => axios.post('/api/stock/temporary/seizure-notes', data),
    releaseFromTemp: (id, data) => axios.post(`/api/stock/temporary/${id}/release`, data),
    escalateToMain: (id, data) => axios.post(`/api/stock/temporary/${id}/escalate`, data),
    downloadSeizureNote: (id) => axios.get(`/api/stock/temporary/${id}/seizure-note`, { responseType: 'blob' }),

    // MAIN STOCK
    getMainStock: () => axios.get('/api/stock/main'),
    downloadPVPdf: (id) => axios.get(`/api/stock/main/${id}/pv-pdf`, { responseType: 'blob' }),
    requestRelease: (id, data) => axios.post(`/api/stock/main/${id}/release-notes`, data),
    requestEdit: (id, data) => axios.post(`/api/stock/main/${id}/request-edit`, data),
    returnForCorrection: (id, reason) => axios.post(`/api/stock/main/${id}/return-for-correction`, { reason }),

    // PRSO APPROVALS
    getPendingApprovals: () => axios.get('/api/stock/main/pending-approvals'),
    approveRelease: (id) => axios.post(`/api/stock/main/release-notes/${id}/approve`),
    rejectRelease: (id, reason) => axios.post(`/api/stock/main/release-notes/${id}/reject`, { reason }),
    approveEdit: (id) => axios.post(`/api/stock/main/edit-requests/${id}/approve`),
    rejectEdit: (id, reason) => axios.post(`/api/stock/main/edit-requests/${id}/reject`, { reason }),
};
