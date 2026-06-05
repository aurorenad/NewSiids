import axios from './axios';

export const stockApi = {
    // TEMPORARY STOCK
    getTemporaryStock: (params = {}) => axios.get('/api/stock/goods/temporary', { params }),
    getSeizureHistory: (params = {}) => axios.get('/api/stock/goods/temporary/history', { params }),
    getNextReference: () => axios.get('/api/stock/goods/temporary/next-reference'),
    createSeizureNote: (data) => axios.post('/api/stock/goods/temporary/seizure-notes', data),
    updateSeizureNote: (id, data) => axios.put(`/api/stock/goods/temporary/seizure-notes/${id}`, data),
    downloadSeizureNote: (id) => axios.get(`/api/stock/goods/temporary/${id}/seizure-note`, { responseType: 'blob' }),
    releaseFromTemporaryStock: (id, data) => axios.post(`/api/stock/goods/temporary/${id}/release`, data),
    escalateToMainStock: (id, data) => axios.post(`/api/stock/goods/temporary/${id}/escalate`, data),

    // --- GOODS STATE MACHINE ---
    approveIntake: (id) => axios.patch(`/api/stock/goods/${id}/approve-intake`),
    returnGoods: (id, reason) => axios.patch(`/api/stock/goods/${id}/return`, { reason }),
    requestReleaseMachine: (id, data) => axios.patch(`/api/stock/goods/${id}/request-release`, data),
    approveReleaseMachine: (id) => axios.patch(`/api/stock/goods/${id}/approve-release`),
    rejectReleaseMachine: (id, reason) => axios.patch(`/api/stock/goods/${id}/reject-release`, { reason }),

    // MAIN STOCK
    getMainStock: (params = {}) => axios.get('/api/stock/goods/main', { params }),
    downloadPVPdf: (id) => axios.get(`/api/stock/goods/${id}/pv-pdf`, { responseType: 'blob' }),

    // PRSO APPROVALS
    getPendingApprovals: () => axios.get('/api/stock/goods/pending-approvals'),
    getApprovalHistory: () => axios.get('/api/stock/goods/approval-history'),
    downloadReleaseNotePdf: (id) => axios.get(`/api/stock/goods/release-notes/${id}/pdf`, { responseType: 'blob' }),
    previewReleaseNotePdf: (data) => axios.post(`/api/stock/goods/release-notes/preview`, data, { responseType: 'blob' }),
};
