import React, { useEffect, useState } from 'react';
import { CaseService } from '../api/Axios/caseApi.jsx';
// import * as XLSX from 'xlsx';
// import { saveAs } from 'file-saver';

const History = () => {
    const [rejectedCases, setRejectedCases] = useState([]);
    const [investigationCases, setInvestigationCases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCases = async () => {
            setLoading(true);
            try {
                const rejectedResponse = await CaseService.getCasesByStatus('REPORT_REJECTED');
                setRejectedCases(rejectedResponse.data);

                // Pending statuses
                const pendingStatuses = [
                    'CASE_CREATED',
                    'REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE',
                    'REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER',
                    'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER'
                ];

                // Fetch all in parallel
                const pendingPromises = pendingStatuses.map(status => CaseService.getCasesByStatus(status));
                const pendingResponses = await Promise.all(pendingPromises);

                // Combine all responses into one array
                const combinedPendingCases = pendingResponses.flatMap(response => response.data);
                setInvestigationCases(combinedPendingCases);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCases();
    }, []);

    const exportToExcel = (data, filename) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cases");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const fileData = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(fileData, `${filename}.xlsx`);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="page-container">
            <h2>Case Work Report</h2>

            <section>
                <h3>Rejected Cases</h3>
                <button onClick={() => exportToExcel(rejectedCases, 'Rejected_Cases')}>
                    Export Rejected Cases to Excel
                </button>
                <table border="1" cellPadding="8" style={{ marginTop: '10px', width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr>
                        <th>Case Number</th>
                        <th>Summary</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rejectedCases.length > 0 ? (
                        rejectedCases.map((item) => (
                            <tr key={item.id}>
                                <td>{item.caseNum}</td>
                                <td>{item.summaryOfInformationCase}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="2">No rejected cases found.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </section>

            <section style={{ marginTop: '40px' }}>
                <h3>Cases Under Investigation</h3>
                <button onClick={() => exportToExcel(investigationCases, 'Investigation_Cases')}>
                    Export Investigation Cases to Excel
                </button>
                <table border="1" cellPadding="8" style={{ marginTop: '10px', width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                    <tr>
                        <th>Case Number</th>
                        <th>Summary</th>
                    </tr>
                    </thead>
                    <tbody>
                    {investigationCases.length > 0 ? (
                        investigationCases.map((item) => (
                            <tr key={item.id}>
                                <td>{item.caseNum}</td>
                                <td>{item.summaryOfInformationCase}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="2">No cases under investigation.</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default History;
