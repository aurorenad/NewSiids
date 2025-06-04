import React from 'react';
import { useLocation } from 'react-router-dom';
import '../../Styles/SurveillanceCaseView.css'

const SurveillanceCaseView = () => {
    const location = useLocation();
    const caseData = location.state;

    if (!caseData) {
        return (
            <div style={{ padding: '20px', color: 'red' }}>
                <h2>No case data found!</h2>
                <p>Please return and fill out the form first.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Surveillance Case Details</h1>
            <ul style={{ lineHeight: '1.6' }}>
                <li><strong>Case Number:</strong> {caseData.caseNumber}</li>
                <li><strong>Informer ID:</strong> {caseData.informerId}</li>
                <li><strong>Tax Payer TIN:</strong> {caseData.taxPayerTin}</li>
                <li><strong>Tax Payer Name:</strong> {caseData.taxPayerName}</li>
                <li><strong>Tax Payer Address:</strong> {caseData.taxPayerAddress}</li>
                <li><strong>Tax Type:</strong> {caseData.taxType}</li>
                <li><strong>Surveillance Officer:</strong> {caseData.intelliceOfficer}</li>
                <li><strong>Reported Date:</strong> {caseData.reportedDate}</li>
                <li><strong>Issue Description:</strong><br />{caseData.issueDescription}</li>
            </ul>
        </div>
    );
};

export default SurveillanceCaseView;
