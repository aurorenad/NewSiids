import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService } from '../api/Axios/caseApi.jsx';
import { AuthContext } from '../context/AuthContext';
import '../Styles/TaxReportForm.css';

const TaxReportForm = () => {
    const { authState } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        tin: '',
        taxPayerName: '',
        taxPayerType: 'Individual',
        taxPayerAddress: '',
        taxPeriod: '',
        intelligenceOfficer: authState.userId || '',
        reportedDate: new Date().toISOString().split('T')[0],
        summaryOfInformationCase: '',
        status: 'CASE_CREATED', // Fixed: Use enum value
        informerId: '',
        informerName: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeoutId, setTimeoutId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const taxPayerTypes = ['Individual', 'Company', 'Partnership', 'Trust', 'PAYEE'];

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

        console.log('Authentication check:');
        console.log('- Token exists:', !!token);
        console.log('- Employee ID:', employeeId);
        console.log('- Current user:', authState.userId);

        if (!token) {
            setError('No authentication token found. Please log in again.');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        if (!employeeId) {
            setError('Employee ID not found. Please ensure you are properly logged in.');
            return;
        }
    }, [authState.userId, navigate]);

    // Load case data if in edit mode
    useEffect(() => {
        if (location.state?.caseData) {
            const { caseData } = location.state;
            setFormData({
                tin: caseData.tin || '',
                taxPayerName: caseData.taxPayerName || '',
                taxPayerType: caseData.taxPayerType || 'Individual',
                taxPayerAddress: caseData.taxPayerAddress || '',
                taxPeriod: caseData.taxPeriod || '',
                intelligenceOfficer: caseData.reportingOfficer || authState.userId || '',
                reportedDate: caseData.reportedDate || new Date().toISOString().split('T')[0],
                summaryOfInformationCase: caseData.summaryOfInformationCase || '',
                status: caseData.status || 'CASE_CREATED',
                informerId: caseData.informerId || '',
                informerName: caseData.informerName || ''
            });
        }
    }, [location.state, authState.userId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!formData.tin) {
            setError('Tax Payer TIN is required');
            return false;
        }
        if (!formData.taxPayerName) {
            setError('Tax Payer Name is required');
            return false;
        }
        if (!formData.summaryOfInformationCase) {
            setError('Summary of information is required');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Pre-submission validation
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

        if (!token) {
            setError('Authentication token is missing. Please log in again.');
            return;
        }

        if (!employeeId) {
            setError('Employee ID is missing. Please log in again.');
            return;
        }

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 15000);
            setTimeoutId(id);

            // Create the case data in the format expected by the API
            const caseData = {
                informerId: formData.informerId || null,
                informerName: formData.informerName || null,
                tin: formData.tin,
                taxPayerName: formData.taxPayerName,
                taxPayerType: formData.taxPayerType,
                taxPayerAddress: formData.taxPayerAddress || null,
                taxPeriod: formData.taxPeriod || null,
                summaryOfInformationCase: formData.summaryOfInformationCase,
                status: formData.status,
                reportedDate: new Date(formData.reportedDate).toISOString()
            };

            console.log('Submitting case data:', caseData);

            const response = await CaseService.createCase(caseData);
            console.log('Case created successfully:', response.data);

            clearTimeout(id);
            setSuccess('Case created successfully!');
            setTimeout(() => navigate('/intelligence-officer'), 2000);
        } catch (err) {
            clearTimeout(timeoutId);

            console.error('Full error object:', err);

            if (err.code === 'ECONNABORTED') {
                setError('Request timed out. Please check your connection and try again.');
            } else if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                setTimeout(() => navigate('/login'), 2000);
            } else if (err.response?.status === 403) {
                setError('You do not have permission to perform this action.');
            } else if (err.response) {
                const errorMsg = err.response.data?.message ||
                    err.response.data?.error ||
                    `Server error (${err.response.status}): ${err.response.statusText}`;
                setError(errorMsg);
            } else if (err.request) {
                setError('No response from server. Please check your network connection.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [timeoutId]);

    return (
        <div className="tax-report-form-container">
            <div className="tax-report-form-card">
                <div className="tax-report-form-header">
                    <h1>New Case Report</h1>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <i className="fas fa-exclamation-circle"></i> {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i> {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="tax-report-form">
                    <div className="tax-report-form-grid">
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer TIN*</label>
                            <input
                                type="text"
                                name="tin"
                                value={formData.tin}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Enter tax identification number"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer Name*</label>
                            <input
                                type="text"
                                name="taxPayerName"
                                value={formData.taxPayerName}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Enter tax payer name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer Type</label>
                            <select
                                name="taxPayerType"
                                value={formData.taxPayerType}
                                onChange={handleChange}
                                className="tax-report-form-input"
                            >
                                {taxPayerTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer Address</label>
                            <input
                                type="text"
                                name="taxPayerAddress"
                                value={formData.taxPayerAddress}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Enter tax payer address"
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Period</label>
                            <input
                                type="text"
                                name="taxPeriod"
                                value={formData.taxPeriod}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="e.g. March, Dec, September"
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Intelligence Officer</label>
                            <input
                                type="text"
                                name="intelligenceOfficer"
                                value={formData.intelligenceOfficer}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Officer name"
                                readOnly
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Reported Date</label>
                            <input
                                type="date"
                                name="reportedDate"
                                value={formData.reportedDate}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Informer ID</label>
                            <input
                                type="text"
                                name="informerId"
                                value={formData.informerId}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="e.g. 119998001"
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Informer Name</label>
                            <input
                                type="text"
                                name="informerName"
                                value={formData.informerName}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Enter informer name"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label className="tax-report-form-label">Summary of Information Provided*</label>
                            <textarea
                                name="summaryOfInformationCase"
                                value={formData.summaryOfInformationCase}
                                onChange={handleChange}
                                rows="4"
                                className="tax-report-form-textarea"
                                placeholder="Detailed description of the case"
                                required
                            />
                        </div>
                    </div>

                    <div className="tax-report-form-buttons">
                        <button
                            type="button"
                            className="tax-report-form-button tax-report-form-button-cancel"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="tax-report-form-button tax-report-form-button-save"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Processing...
                                </>
                            ) : (
                                'Create Case'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaxReportForm;