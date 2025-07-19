import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Card, ListGroup, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

const FindingsViewerPage = () => {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState([]);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await axios.get(`/api/reports/${id}/findings`, {
                    headers: {
                        'employee_id': localStorage.getItem('employeeId')
                    }
                });
                setReport(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch report findings');
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [id]);

    const downloadAttachment = async (attachmentIndex) => {
        try {
            setDownloading(prev => [...prev, attachmentIndex]);
            const response = await axios.get(`/api/reports/${id}/findings-attachments/${attachmentIndex}`, {
                headers: {
                    'employee_id': localStorage.getItem('employeeId')
                },
                responseType: 'blob'
            });

            // Extract filename from content-disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'attachment';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length === 2) {
                    filename = filenameMatch[1];
                }
            }

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Download failed:', err);
            alert('Failed to download attachment');
        } finally {
            setDownloading(prev => prev.filter(item => item !== attachmentIndex));
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

    return (
        <Container className="mt-4 mb-5">
            <h2 className="mb-4">Report Findings</h2>

            <Card className="mb-4">
                <Card.Header as="h5">Report Details</Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <ListGroup variant="flush">
                                <ListGroup.Item>
                                    <strong>Report ID:</strong> {report.id}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Status:</strong> {report.status}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Created By:</strong> {report.createdBy}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Created At:</strong> {formatDate(report.createdAt)}
                                </ListGroup.Item>
                            </ListGroup>
                        </Col>
                        <Col md={6}>
                            <ListGroup variant="flush">
                                <ListGroup.Item>
                                    <strong>Current Recipient:</strong> {report.currentRecipient || 'N/A'}
                                </ListGroup.Item>
                                <ListGroup.Item>
                                    <strong>Last Updated:</strong> {formatDate(report.updatedAt)}
                                </ListGroup.Item>
                                {report.approvedBy && (
                                    <ListGroup.Item>
                                        <strong>Approved By:</strong> {report.approvedBy} on {formatDate(report.approvedAt)}
                                    </ListGroup.Item>
                                )}
                                {report.rejectedBy && (
                                    <ListGroup.Item>
                                        <strong>Rejected By:</strong> {report.rejectedBy} on {formatDate(report.rejectedAt)}
                                        <br />
                                        <strong>Reason:</strong> {report.rejectionReason || 'No reason provided'}
                                    </ListGroup.Item>
                                )}
                            </ListGroup>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {report.relatedCase && (
                <Card className="mb-4">
                    <Card.Header as="h5">Related Case</Card.Header>
                    <Card.Body>
                        <ListGroup variant="flush">
                            <ListGroup.Item>
                                <strong>Case Number:</strong> {report.relatedCase.caseNum}
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <strong>Case Title:</strong> {report.relatedCase.title}
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <strong>Case Status:</strong> {report.relatedCase.status}
                            </ListGroup.Item>
                        </ListGroup>
                    </Card.Body>
                </Card>
            )}

            <Card className="mb-4">
                <Card.Header as="h5">Findings</Card.Header>
                <Card.Body>
                    {report.findings ? (
                        <div style={{ whiteSpace: 'pre-line' }}>{report.findings}</div>
                    ) : (
                        <Alert variant="info">No findings submitted yet</Alert>
                    )}
                </Card.Body>
            </Card>

            <Card className="mb-4">
                <Card.Header as="h5">Recommendations</Card.Header>
                <Card.Body>
                    {report.recommendations ? (
                        <div style={{ whiteSpace: 'pre-line' }}>{report.recommendations}</div>
                    ) : (
                        <Alert variant="info">No recommendations submitted yet</Alert>
                    )}
                </Card.Body>
            </Card>

            {report.findingsAttachmentPaths && report.findingsAttachmentPaths.length > 0 && (
                <Card className="mb-4">
                    <Card.Header as="h5">Attachments</Card.Header>
                    <Card.Body>
                        <ListGroup variant="flush">
                            {report.findingsAttachmentPaths.map((path, index) => {
                                const filename = path.includes('_') ? path.substring(path.indexOf('_') + 1) : path;
                                return (
                                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                                        <span>{filename}</span>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => downloadAttachment(index)}
                                            disabled={downloading.includes(index)}
                                        >
                                            {downloading.includes(index) ? (
                                                <>
                                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                    <span className="visually-hidden">Downloading...</span>
                                                </>
                                            ) : (
                                                'Download'
                                            )}
                                        </Button>
                                    </ListGroup.Item>
                                );
                            })}
                        </ListGroup>
                    </Card.Body>
                </Card>
            )}

            {report.attachmentPath && (
                <Card className="mb-4">
                    <Card.Header as="h5">Original Report Attachment</Card.Header>
                    <Card.Body>
                        <Button
                            variant="outline-primary"
                            onClick={() => window.open(`/api/reports/${id}/attachment`, '_blank')}
                        >
                            Download Original Attachment
                        </Button>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
};

export default FindingsViewerPage;