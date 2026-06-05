import axios from 'axios';

// Create central Axios client
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Auth token and correlation ID
apiClient.interceptors.request.use(
  (config) => {
    // 1. Inject Authentication Token
    const token = localStorage.getItem('siids_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Inject Correlation ID for tracing
    let correlationId = localStorage.getItem('siids_correlation_id');
    if (!correlationId) {
      // Create simple UUID-like random identifier
      correlationId = `cl-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('siids_correlation_id', correlationId);
    }
    config.headers['X-Correlation-ID'] = correlationId;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle unified error shapes and token expiry redirects
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      // Token expired or invalid - clear local storage and redirect to login
      localStorage.removeItem('siids_token');
      localStorage.removeItem('siids_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Standardize error return shape to match backend REST Envelope
    const standardError = {
      success: false,
      timestamp: new Date().toISOString(),
      data: null,
      error: error.response?.data?.error || {
        code: 'NETWORK_ERROR',
        message: error.message || 'An unexpected connection error occurred.',
        details: []
      }
    };

    return Promise.reject(standardError);
  }
);

export default apiClient;
