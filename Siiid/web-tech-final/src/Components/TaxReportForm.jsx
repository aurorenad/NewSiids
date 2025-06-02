import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService } from '../api/Axios/caseApi.jsx';
import { AuthContext } from '../context/AuthContext';
import '../Styles/TaxReportForm.css';

const TaxReportForm = () => {
    const { currentUser } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        caseNumber: '',
        taxPayerTin: '',
        taxPayerName: '',
        taxPayerType: 'Individual',
        taxPayerAddress: '',
        period: '',
        intelligenceOfficer: currentUser || '',
        reportedDate: new Date().toISOString().split('T')[0],
        issueDescription: '',
        status: 'Open',
        informerId: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeoutId, setTimeoutId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const taxPayerTypes = ['Individual', 'Company', 'Partnership', 'Trust'];

    // Load case data if in edit mode
    useEffect(() => {
        if (location.state?.caseData) {
            const { caseData } = location.state;
            setFormData({
                caseNumber: caseData.caseNumber || '',
                taxPayerTin: caseData.taxpayerInfo?.tin || '',
                taxPayerName: caseData.taxpayerInfo?.name || '',
                taxPayerType: caseData.taxpayerInfo?.type || 'Individual',
                taxPayerAddress: caseData.taxpayerInfo?.address || '',
                period: caseData.period || '',
                intelligenceOfficer: caseData.reportingOfficer || currentUser || '',
                reportedDate: caseData.reportDate || new Date().toISOString().split('T')[0],
                issueDescription: caseData.description || '',
                status: caseData.status || 'Open',
                informerId: caseData.informerId || ''
            });
        }
    }, [location.state, currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!formData.caseNumber) {
            setError('Case number is required');
            return false;
        }
        if (!formData.taxPayerTin) {
            setError('Tax Payer TIN is required');
            return false;
        }
        if (!formData.taxPayerName) {
            setError('Tax Payer Name is required');
            return false;
        }
        if (!formData.issueDescription) {
            setError('Issue description is required');
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
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            setTimeoutId(id);

            const caseData = {
                caseNumber: formData.caseNumber,
                taxpayerInfo: {
                    tin: formData.taxPayerTin,
                    name: formData.taxPayerName,
                    type: formData.taxPayerType,
                    address: formData.taxPayerAddress
                },
                reportingOfficer: formData.intelligenceOfficer,
                reportDate: formData.reportedDate,
                description: formData.issueDescription,
                period: formData.period,
                status: formData.status,
                informerId: formData.informerId
            };

            if (location.state?.caseData?.id) {
                await CaseService.updateCase(location.state.caseData.id, caseData, {
                    signal: controller.signal
                });
                setSuccess('Case updated successfully!');
            } else {
                await CaseService.createCase(caseData, {
                    signal: controller.signal
                });
                setSuccess('Case created successfully!');
            }

            clearTimeout(id);
            setTimeout(() => navigate('/intelligence-officer/view'), 2000);
        } catch (err) {
            clearTimeout(timeoutId);

            if (err.code === 'ECONNABORTED') {
                setError('Request timed out. Please check your connection and try again.');
            } else if (err.response) {
                // Server responded with error status
                setError(err.response.data?.message ||
                    err.response.data?.error ||
                    'Failed to submit case. Please try again.');
            } else if (err.request) {
                // Request was made but no response received
                setError('No response from server. Please check your network connection.');
            } else {
                // Other errors
                setError('An unexpected error occurred. Please try again.');
            }

            console.error('Submission error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [timeoutId]);

    return (
        <div className="tax-report-form-container">
            <div className="tax-report-form-card">
                <div className="tax-report-form-header">
                    <h1>{location.state?.caseData ? "Edit Case" : "New Case Report"}</h1>
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
                            <label className="tax-report-form-label">Case Number*</label>
                            <input
                                type="text"
                                name="caseNumber"
                                value={formData.caseNumber}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Enter case number"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer TIN*</label>
                            <input
                                type="text"
                                name="taxPayerTin"
                                value={formData.taxPayerTin}
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
                            <label className="tax-report-form-label">Period</label>
                            <input
                                type="text"
                                name="period"
                                value={formData.period}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="e.g. Q1 2023, FY2022"
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
                                placeholder="Optional informer identifier"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label className="tax-report-form-label">Summary of Information Provided*</label>
                            <textarea
                                name="issueDescription"
                                value={formData.issueDescription}
                                onChange={handleChange}
                                rows="4"
                                className="tax-report-form-textarea"
                                placeholder="Detailed description of the case"
                                required
                            />
                        </div>

                        {location.state?.caseData && (
                            <div className="form-group">
                                <label className="tax-report-form-label">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="tax-report-form-input"
                                >
                                    <option value="Open">Open</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                        )}
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
                                location.state?.caseData ? 'Update Case' : 'Create Case'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaxReportForm;