import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const caseApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000,
});

// Enhanced request interceptor
caseApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    const employeeId = localStorage.getItem('employeeId') || localStorage.getItem('userId');

    // Debug logging
    console.log('Request interceptor:');
    console.log('- Token:', token ? 'Present' : 'Missing');
    console.log('- Employee ID:', employeeId);

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Add Employee-Id header if available
    if (employeeId) {
        config.headers['Employee-Id'] = employeeId;
    }

    return config;
}, (error) => Promise.reject(error));

// Enhanced response interceptor
caseApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('401 Unauthorized - Token may be invalid or expired');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const CaseService = {
    createCase: (caseData, currentUser) => {
        console.log('Creating case with data:', caseData);

        const apiData = {
            informerId: caseData.informerId || '',
            informerName: caseData.informerName || '',
            tin: caseData.taxpayerInfo?.tin || caseData.tin,
            taxPayerName: caseData.taxpayerInfo?.name || caseData.taxPayerName,
            taxPayerType: caseData.taxpayerInfo?.type || caseData.taxPayerType,
            taxPayerAddress: caseData.taxpayerInfo?.address || caseData.taxPayerAddress,
            taxPeriod: caseData.period || caseData.taxPeriod,
            summaryOfInformationCase: caseData.description || caseData.summaryOfInformationCase,
            status: caseData.status || 'case_created',
            reportedDate: caseData.reportDate || caseData.reportedDate,
            updatedAt: null
        };

        console.log('Transformed API data:', apiData);

        return caseApi.post('/api/cases', apiData);
    },
    updateCase: (id, caseData, options = {}) => caseApi.put(`/Case/${id}`, caseData, options),
    getCase: (id) => caseApi.get(`/Case/${id}`),
    getAllCases: () => caseApi.get('/api/cases'),
    deleteCase: (id) => caseApi.delete(`/Case/${id}`),
};

export default caseApi;