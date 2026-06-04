import axios from './axios';

export const adminApi = {
    getUsers: () => axios.get('/users'),
    registerUser: (data) => axios.post('/admin/register-user', data),
    deactivateUser: (id) => axios.put(`/users/${id}/deactivate`, {}),
    updateUserRole: (id, data) => axios.put(`/users/${id}/role`, data),
    getRoleHistory: (username) => axios.get(`/users/${username}/role-history`),
    getAccountAuditLogs: (username) => axios.get(`/users/${username}/account-audit-logs`),
};
