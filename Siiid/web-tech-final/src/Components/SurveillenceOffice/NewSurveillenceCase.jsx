import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { IconButton } from "@mui/material";
import '../../Styles/NewSurveillenceCases.css';

const NewSurveillenceCase = () => {
    const [formData, setFormData] = useState({
        informerId: '',
        caseNumber: '',
        taxPayerTin: '',
        taxPayerName: '',
        taxPayerAddress: '',
        taxType: '',
        intelliceOfficer: '',
        reportedDate: '',
        issueDescription: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        setTimeout(() => {
            setIsSubmitting(false);
            alert("Form submitted! Redirecting to view page...");
            navigate('/surveillence-officer/view', { state: formData });
        }, 1000);
    };

    return (
        <div className="tax-report-form-container">
            <div className="tax-report-form-card">
                <div className="tax-report-form-header">
                    <h1>Surveillance Form</h1>
                </div>

                <form onSubmit={handleSubmit} className="tax-report-form">
                    <div className="tax-report-form-grid">
                        <div>
                            <label>Case Number</label>
                            <input type="text" name="caseNumber" value={formData.caseNumber} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Informer ID</label>
                            <input type="text" name="informerId" value={formData.informerId} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Tax Payer TIN</label>
                            <input type="text" name="taxPayerTin" value={formData.taxPayerTin} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Tax Payer Name</label>
                            <input type="text" name="taxPayerName" value={formData.taxPayerName} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Tax Payer Address</label>
                            <input type="text" name="taxPayerAddress" value={formData.taxPayerAddress} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Tax Type</label>
                            <input type="text" name="taxType" value={formData.taxType} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Surveillance Officer</label>
                            <input type="text" name="intelliceOfficer" value={formData.intelliceOfficer} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Reported Date</label>
                            <input type="date" name="reportedDate" value={formData.reportedDate} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>Issue Description</label>
                            <textarea name="issueDescription" value={formData.issueDescription} onChange={handleChange} rows="3" required />
                        </div>
                        <IconButton><AttachFileIcon /></IconButton>
                    </div>

                    <div className="tax-report-form-buttons">
                        <button type="button" onClick={() => navigate('/surveillence-officer')}>Cancel</button>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewSurveillenceCase;
