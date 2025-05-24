import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Styles/TaxReportView.css';

const TaxReportView = () => {
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        const storedData = localStorage.getItem('taxReportData');
        if (storedData) {
            setReportData(JSON.parse(storedData));
        } else {
            alert("No report data found. Redirecting...");
            navigate('/intelligence-officer');
        }
    }, [navigate]);

    const handlePrint = () => {
        window.print();
    };

    if (!reportData) return <div>Loading...</div>;

    const currentDate = new Date().toLocaleDateString('en-US');

    return (
        <div className="tax-report-container">
            <div className="tax-report-card">
                <div className="header">
                    <h1 className="title">Tax Report</h1>
                    <div className="action-buttons">
                        <button onClick={handlePrint} className="print-btn">Print</button>
                    </div>
                </div>

                <div className="content">
                    <table className="report-table">
                        <tbody>
                        <tr><td className="header-cell">Informer ID</td><td>{reportData.informerId}</td></tr>
                        <tr><td className="header-cell">Case Number</td><td>{reportData.caseNumber}</td></tr>
                        <tr><td className="header-cell">Tax Payer TIN</td><td>{reportData.taxPayerTin}</td></tr>
                        <tr><td className="header-cell">Tax Payer Name</td><td>{reportData.taxPayerName}</td></tr>
                        <tr><td className="header-cell">Tax Payer Type</td><td>{reportData.taxPayerType}</td></tr>
                        <tr><td className="header-cell">Tax Payer Address</td><td>{reportData.taxPayerAddress}</td></tr>
                        <tr><td className="header-cell">Period</td><td>{reportData.period}</td></tr>
                        <tr><td className="header-cell">Investigation Officer</td><td>{reportData.intelliceOfficer}</td></tr>
                        <tr><td className="header-cell">Reported Date</td><td>{reportData.reportedDate}</td></tr>
                        <tr><td className="header-cell">Issue Description</td><td>{reportData.issueDescription}</td></tr>
                        </tbody>
                    </table>
                    <div className="footer">
                        <p>Issued At: RRA Offices</p>
                        <p>Date: {currentDate}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxReportView;
