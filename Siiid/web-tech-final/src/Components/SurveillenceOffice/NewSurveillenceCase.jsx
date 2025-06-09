import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CaseService } from '../../api/Axios/caseApi.jsx';
import '../../Styles/NewSurveillenceCases.css';

const NewSurveillenceCase = () => {
    const [formData, setFormData] = useState({
        informerId: '',
        informerName: '',
        caseNumber: '',
        tin: '', // Previously taxPayerTin
        taxPayerName: '',
        taxPayerAddress: '',
        taxPayerType: 'Individual', // Previously taxType
        taxPeriod: '',
        intelligenceOfficer: '',
        reportedDate: new Date().toISOString().split('T')[0],
        summaryOfInformationCase: '', // Previously issueDescription
        status: 'case_created'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    const taxPayerTypes = ['Individual', 'Company', 'Partnership', 'Trust', 'PAYEE'];

    useEffect(() => {
        const officer = localStorage.getItem('employeeId');
        if (officer) {
            setFormData(prev => ({
                ...prev,
                intelligenceOfficer: officer
            }));
        } else {
            setError("No employee ID found. Please log in.");
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.caseNumber || !formData.tin || !formData.taxPayerName || !formData.summaryOfInformationCase) {
            setError("Please fill in all required fields: Case Number, TIN, Tax Payer Name, and Summary.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        if (!validateForm()) {
            setIsSubmitting(false);
            return;
        }

        try {
            const currentUser = localStorage.getItem('employeeId') || 'Unknown';

            const response = await CaseService.createCase(formData, currentUser);

            if (response.data) {
                setSuccess("Case successfully created.");
                setTimeout(() => {
                    navigate('/surveillence-officer/view', { state: response.data });
                }, 1500);
            }
        } catch (err) {
            console.error("Error creating case:", err);
            setError(err.response?.data?.message || "Failed to create case. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="tax-report-form-container">
            <div className="tax-report-form-card">
                <div className="tax-report-form-header">
                    <h1>New Surveillance Case</h1>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit} className="tax-report-form">
                    <div className="tax-report-form-grid">
                        <div className="form-group">
                            <label>Case Number*</label>
                            <input
                                type="text"
                                name="caseNumber"
                                value={formData.caseNumber}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tax Payer TIN*</label>
                            <input
                                type="text"
                                name="tin"
                                value={formData.tin}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tax Payer Name*</label>
                            <input
                                type="text"
                                name="taxPayerName"
                                value={formData.taxPayerName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Tax Payer Address</label>
                            <input
                                type="text"
                                name="taxPayerAddress"
                                value={formData.taxPayerAddress}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Tax Payer Type</label>
                            <select
                                name="taxPayerType"
                                value={formData.taxPayerType}
                                onChange={handleChange}
                            >
                                {taxPayerTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tax Period</label>
                            <input
                                type="text"
                                name="taxPeriod"
                                value={formData.taxPeriod}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Intelligence Officer</label>
                            <input
                                type="text"
                                name="intelligenceOfficer"
                                value={formData.intelligenceOfficer}
                                onChange={handleChange}
                                readOnly
                            />
                        </div>

                        <div className="form-group">
                            <label>Reported Date</label>
                            <input
                                type="date"
                                name="reportedDate"
                                value={formData.reportedDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Informer ID</label>
                            <input
                                type="text"
                                name="informerId"
                                value={formData.informerId}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Informer Name</label>
                            <input
                                type="text"
                                name="informerName"
                                value={formData.informerName}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>Summary of Information Provided*</label>
                            <textarea
                                name="summaryOfInformationCase"
                                value={formData.summaryOfInformationCase}
                                onChange={handleChange}
                                rows="4"
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
                            {isSubmitting ? 'Submitting...' : 'Create Case'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewSurveillenceCase;
