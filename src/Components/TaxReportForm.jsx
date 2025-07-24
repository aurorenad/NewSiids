import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService } from '../api/Axios/caseApi.jsx';
import { AuthContext } from '../context/AuthContext';
import caseApi from '../api/Axios/caseApi.jsx';
import '../Styles/TaxReportForm.css';

const TaxReportForm = () => {
    const { authState } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        tin: '',
        taxPayerName: '',
        taxType: 'None',
        taxPayerAddress: '',
        taxPeriod: '',
        intelligenceOfficer: authState.userId || '',
        reportedDate: new Date().toISOString().split('T')[0],
        summaryOfInformationCase: '',
        status: 'CASE_CREATED',
        informerId: '',
        informerName: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeoutId, setTimeoutId] = useState(null);
    const [isSearchingTaxPayer, setIsSearchingTaxPayer] = useState(false);
    const [isSearchingInformer, setIsSearchingInformer] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const taxTypes = ['None','PAYEE','VAT','Income Tax','Corporate Tax','Withholding Tax','Property Tax',
        'Capital gains','Consumption Tax','Immovable Property Tax', 'Payroll Tax', 'Trading Tax'];

    // Authentication check
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

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
                taxType: caseData.taxType || 'None',
                taxPayerAddress: caseData.taxPayerAddress || '',
                taxPeriod: caseData.taxPeriod || '',
                intelligenceOfficer: caseData.reportingOfficer || authState.userId || '',
                reportedDate: caseData.reportedDate || new Date().toISOString().split('T')[0],
                summaryOfInformationCase: caseData.summaryOfInformationCase || '',
                status: caseData.status || 'CASE_CREATED',
                informerId: caseData.informerId ? caseData.informerId.toString() : '',
                informerName: caseData.informerName || ''
            });
        }
    }, [location.state, authState.userId]);

    // Tax payer lookup by TIN
    const handleTinChange = async (e) => {
        const { value } = e.target;
        handleChange(e);

        if (value.length >= 3) {
            setIsSearchingTaxPayer(true);
            try {
                const response = await caseApi.get(`/api/taxpayers/tin/${value}`);

                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        taxPayerName: response.data.taxPayerName || prev.taxPayerName,
                        taxPayerAddress: response.data.taxPayerAddress || prev.taxPayerAddress
                    }));
                }
            } catch (error) {
                console.error('Error fetching tax payer:', error);
            } finally {
                setIsSearchingTaxPayer(false);
            }
        }
    };

    // Informer lookup by ID
    const handleInformerIdChange = async (e) => {
        const { value } = e.target;
        handleChange(e);

        if (value) {
            setIsSearchingInformer(true);
            try {
                const response = await caseApi.get(`/api/informers/${value}`);

                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        informerName: response.data.informerName || prev.informerName
                    }));
                }
            } catch (error) {
                console.error('Error fetching informer:', error);
            } finally {
                setIsSearchingInformer(false);
            }
        }
    };

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

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const caseData = {
                tin: formData.tin,
                taxPayerName: formData.taxPayerName,
                taxType: formData.taxType,
                taxPayerAddress: formData.taxPayerAddress,
                taxPeriod: formData.taxPeriod || null,
                summaryOfInformationCase: formData.summaryOfInformationCase,
                status: formData.status,
                informerNationalId: formData.informerId ? parseInt(formData.informerId) : null,
                informerName: formData.informerName || null,
                reportedDate: new Date(formData.reportedDate).toISOString()
            };

            const response = await CaseService.createCase(caseData);
            setSuccess('Case created successfully!');
            const id = setTimeout(() => navigate('/intelligence-officer'), 2000);
            setTimeoutId(id);
        } catch (err) {
            console.error('Error creating case:', err);

            if (err.response?.status === 401) {
                setError('Session expired. Please log in again.');
                const id = setTimeout(() => navigate('/login'), 2000);
                setTimeoutId(id);
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to create case. Please try again.');
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
                        {/* TIN Field */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer TIN*</label>
                            <input
                                type="text"
                                name="tin"
                                value={formData.tin}
                                onChange={handleTinChange}
                                className="tax-report-form-input"
                                placeholder="Enter tax identification number"
                                required
                            />
                            {isSearchingTaxPayer && (
                                <div className="search-indicator">Searching tax payer...</div>
                            )}
                        </div>

                        {/* Tax Payer Name */}
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

                        {/* Tax Type */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Type</label>
                            <select
                                name="taxType"
                                value={formData.taxType}
                                onChange={handleChange}
                                className="tax-report-form-input"
                            >
                                {taxTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tax Payer Address */}
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

                        {/* Tax Period */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Period</label>
                            <input
                                type="text"
                                name="taxPeriod"
                                value={formData.taxPeriod}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="e.g. March 2023, Q2 2023, FY2023"
                            />
                        </div>

                        {/* Intelligence Officer */}
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

                        {/* Reported Date */}
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

                        {/* Informer ID */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Informer ID</label>
                            <input
                                type="text"
                                name="informerId"
                                value={formData.informerId}
                                onChange={handleInformerIdChange}
                                className="tax-report-form-input"
                                placeholder="Enter national ID number"
                                pattern="\d*"
                                title="Please enter numbers only"
                            />
                            {isSearchingInformer && (
                                <div className="search-indicator">Searching informer...</div>
                            )}
                        </div>

                        {/* Informer Name */}
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

                        {/* Summary of Information */}
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