import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/TaxReportForm.css';

const TaxReportForm = () => {
    const [formData, setFormData] = useState({
        informerId: '',
        caseNumber: '',
        taxPayerTin: '',
        taxPayerName: '',
        taxPayerType: '',
        taxPayerAddress: '',
        period: '',
        intelliceOfficer: '',
        reportedDate: '',
        issueDescription: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const navigate = useNavigate();

    // Check for existing data
    useEffect(() => {
        const storedData = localStorage.getItem('taxReportData');
        if (storedData) {
            setFormData(JSON.parse(storedData));
            setIsEditMode(true);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        setTimeout(() => {
            localStorage.setItem('taxReportData', JSON.stringify(formData));
            setIsSubmitting(false);
            alert(isEditMode ? "Report updated successfully!" : "Report submitted successfully!");
            navigate('/intelligence-officer/view');
        }, 1000);
    };

    return (
        <div className="tax-report-form-container">
            <div className="tax-report-form-card">
                <div className="tax-report-form-header">
                    <h1>{isEditMode ? "Edit Informer's Log" : "Informer's Log Form"}</h1>
                </div>

                <form onSubmit={handleSubmit} className="tax-report-form">
                    <div className="tax-report-form-grid">
                        <div>
                            <label className="tax-report-form-label">Informer ID</label>
                            <input
                                type="text"
                                name="informerId"
                                value={formData.informerId}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>

                        <div>
                            <label className="tax-report-form-label">Case Number</label>
                            <input
                                type="text"
                                name="caseNumber"
                                value={formData.caseNumber}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>

                        <div>
                            <label className="tax-report-form-label">Tax Payer TIN</label>
                            <input
                                type="text"
                                name="taxPayerTin"
                                value={formData.taxPayerTin}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="tax-report-form-label">Tax Payer Name</label>
                            <input
                                type="text"
                                name="taxPayerName"
                                value={formData.taxPayerName}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="tax-report-form-label">Tax Payer Type</label>
                            <input
                                type="text"
                                name="taxPayerType"
                                value={formData.taxPayerType}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="tax-report-form-label">Tax Payer Address</label>
                            <input
                                type="text"
                                name="taxPayerAddress"
                                value={formData.taxPayerAddress}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="tax-report-form-label">Period</label>
                            <input
                                type="text"
                                name="period"
                                value={formData.period}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="tax-report-form-label">Intelligence Officer</label>
                            <input
                                type="text"
                                name="intelliceOfficer"
                                value={formData.intelliceOfficer}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                required
                            />
                        </div>

                        <div>
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

                        <div>
                            <label className="tax-report-form-label">Summary of Information Provided</label>
                            <textarea
                                name="issueDescription"
                                value={formData.issueDescription}
                                onChange={handleChange}
                                rows="3"
                                className="tax-report-form-textarea"
                                required
                            />
                        </div>
                    </div>

                    <div className="tax-report-form-buttons">
                        <button
                            type="button"
                            className="tax-report-form-button tax-report-form-button-cancel"
                            onClick={() => navigate('/tax-report-view')}
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
                                    <span className="tax-report-form-button-spinner"></span>
                                    Processing...
                                </>
                            ) : (
                                isEditMode ? 'Update' : 'Save'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaxReportForm;
