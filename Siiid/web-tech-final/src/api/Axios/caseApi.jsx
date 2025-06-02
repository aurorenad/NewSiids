import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const caseApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization':`Bearer ${token}`
    },
    timeout: 60000,
});

// caseApi.interceptors.request.use(
//     (config) => {
//         const token = localStorage.getItem('token') || sessionStorage.getItem('token');
//         if (token) {
//             config.headers['Authorization'] = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => Promise.reject(error)
// );

// caseApi.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (error.code === 'ECONNABORTED') {
//             error.message = 'The request took too long - please try again later';
//         }
//         return Promise.reject(error);
//     }
// );

// caseApi.interceptors.response.use(
//     (response) => response,
//     async (error) => {
//         const originalRequest = error.config;
//
//         if (
//             error.response &&
//             error.response.status === 401 &&
//             !originalRequest._retry
//         ) {
//             originalRequest._retry = true;
//             try {
//                 const refreshToken = localStorage.getItem('refreshToken');
//                 if (!refreshToken) {
//                     window.location.href = '/';
//                     return Promise.reject(error);
//                 }
//
//                 const refreshResponse = await axios.post(`${BASE_URL}/refresh_token`, {
//                     token: refreshToken,
//                 });
//
//                 const { access_token } = refreshResponse.data;
//
//                 localStorage.setItem('authToken', access_token);
//
//                 // Update the original request's Authorization header
//                 originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
//
//                 return caseApi(originalRequest); // Use your configured axios instance
//             } catch (refreshError) {
//                 console.error('Token refresh failed:', refreshError);
//                 localStorage.removeItem('authToken');
//                 localStorage.removeItem('refreshToken');
//                 window.location.href = '/login';
//                 return Promise.reject(refreshError);
//             }
//         }
//
//         return Promise.reject(error);
//     }
// );


export const CaseService = {
    createCase: (caseData) => caseApi.post('/api/cases', caseData),
    updateCase: (id, caseData) => caseApi.put(`/Case/${id}`, caseData),
    getCase: (id) => caseApi.get(`/Case/${id}`),
    getAllCases: () => caseApi.get('/Case/all'),
    deleteCase: (id) => caseApi.delete(`/Case/${id}`),
};

export default caseApi;