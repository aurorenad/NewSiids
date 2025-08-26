import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Button, Alert, Spinner } from 'react-bootstrap';
import { ReportApi } from '../api/Axios/caseApi';
import MissionDocumentTable from './MissionDocumentTable';

const FindingsViewPage = () => {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState([]);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await ReportApi.getFindings(id);
                setReport(response.data);
            } catch (err) {
                console.error('Error fetching findings:', err);
                setError(err.response?.data?.message || 'Failed to fetch report findings');
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [id]);

    const downloadAttachment = async (attachmentPath) => {
        try {
            setDownloading(prev => [...prev, attachmentPath]);

            const response = await ReportApi.downloadFindingsAttachment(id, attachmentPath);

            const contentDisposition = response.headers['content-disposition'];
            let filename = 'attachment.pdf';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch && filenameMatch.length === 2) {
                    filename = filenameMatch[1];
                }
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setDownloading(prev => prev.filter(item => item !== attachmentPath));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">
                    {error}
                </Alert>
            </Container>
        );
    }

    if (!report) {
        return (
            <Container className="mt-5">
                <Alert variant="warning">
                    Report not found
                </Alert>
            </Container>
        );
    }

    const reportData = {
        header: {
            header1: "RWANDA REVENUE AUTHORITY",
            header2: "TAXES FOR GROWTH AND DEVELOPMENT",
            title: "REPORT FINDINGS DOCUMENT",
            reference: `ReferenceID : ${report.id}`,
            date: `Date: ${formatDate(report.createdAt)}`
        },
        sections: [
            {
                title: "Report Details",
                rows: [
                    { label: "Status", value: report.status },
                    { label: "Created By", value: report.createdBy },
                    { label: "Created At", value: formatDate(report.createdAt) },
                    { label: "Current Recipient", value: report.currentRecipient || 'N/A' },
                    { label: "Last Updated", value: formatDate(report.updatedAt) },
                    ...(report.approvedBy ? [
                        { label: "Approved By", value: `${report.approvedBy} on ${formatDate(report.approvedAt)}` }
                    ] : []),
                    ...(report.rejectedBy ? [
                        { label: "Rejected By", value: `${report.rejectedBy} on ${formatDate(report.rejectedAt)}` },
                        { label: "Reason", value: report.rejectionReason || 'No reason provided' }
                    ] : [])
                ]
            },
            ...(report.relatedCase ? [{
                title: "Related Case",
                rows: [
                    { label: "Case Number", value: report.relatedCase.caseNum },
                    { label: "Case Status", value: report.relatedCase.status }
                ]
            }] : []),
            {
                title: "Findings",
                rows: [
                    {
                        label: "Findings Details",
                        value: report.findings || "No findings submitted yet",
                        isTextArea: true
                    }
                ]
            },
            {
                title: "Recommendations",
                rows: [
                    {
                        label: "Recommendations Details",
                        value: report.recommendations || "No recommendations submitted yet",
                        isTextArea: true
                    }
                ]
            },
            {
                title: "Tax fines",
                rows: [
                    {
                        label: "Principle Tax",
                        value: report.principleAmount || 'N/A',
                    },
                    {
                        label: "Tax fines",
                        value: report.penaltiesAmount || 'N/A',
                    },
                    {
                        label: "Total Tax",
                        value: (report.principleAmount + report.penaltiesAmount) || 'N/A',
                    }
                ]
            }
        ],
        footer: {
            issuedAt: `Issued at Kigali on ${formatDate(report.createdAt)}`,
            signature: "Signature: ________________________"
        }
    };

    return (
        <Container className="mt-4 mb-5" style={{ Width: '100%'}}>
                <MissionDocumentTable
                    data={reportData}
                    attachments={report.findingsAttachmentPaths || []}
                    onDownloadAttachment={downloadAttachment}
                    downloading={downloading}
                />
        </Container>
    );
};

export default FindingsViewPage;