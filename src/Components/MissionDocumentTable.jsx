import React from 'react';
import { Button, ListGroup, Spinner } from 'react-bootstrap';

const MissionDocumentTable = ({ data, attachments, onDownloadAttachment, downloading }) => {
    return (
        <div style={{
            border: '1px solid #ddd',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: 'white'
        }}>
            {/* Header */}
            <div style={{
                textAlign: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid #ddd',
                paddingBottom: '10px'
            }}>
                <h3 style={{ marginBottom: '5px' }}>RWANDA REVENUE AUTHORITY</h3>
                <h5 style={{ marginBottom: '5px' }}>TAXES FOR GROWTH AND DEVELOPMENT</h5>
                <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>{data.header.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em' }}>
                    <span>{data.header.reference}</span>
                    <span>{data.header.date}</span>
                </div>
            </div>

            {/* Sections */}
            {data.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} style={{ marginBottom: '25px' }}>
                    <h5 style={{
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderLeft: '4px solid #0066cc',
                        marginBottom: '15px'
                    }}>
                        {section.title}
                    </h5>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                        {section.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{
                                    width: '30%',
                                    padding: '10px',
                                    fontWeight: 'bold',
                                    verticalAlign: 'top'
                                }}>
                                    {row.label}
                                </td>
                                <td style={{
                                    padding: '10px',
                                    whiteSpace: row.isTextArea ? 'pre-line' : 'normal'
                                }}>
                                    {row.value}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                    <h5 style={{
                        backgroundColor: '#f5f5f5',
                        padding: '8px',
                        borderLeft: '4px solid #0066cc',
                        marginBottom: '15px'
                    }}>
                        Attachments
                    </h5>

                    <ListGroup variant="flush">
                        {attachments.map((path, index) => {
                            const filename = path.includes('_') ? path.substring(path.indexOf('_') + 1) : path;
                            return (
                                <ListGroup.Item key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px',
                                    borderBottom: '1px solid #eee'
                                }}>
                                    <span>{filename}</span>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => onDownloadAttachment(index)}
                                        disabled={downloading.includes(index)}
                                        style={{ minWidth: '100px' }}
                                    >
                                        {downloading.includes(index) ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                                <span style={{ marginLeft: '5px' }}>Downloading...</span>
                                            </>
                                        ) : (
                                            'Download'
                                        )}
                                    </Button>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                </div>
            )}

            {/* Footer */}
            <div style={{
                marginTop: '30px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9em',
                borderTop: '1px solid #ddd',
                paddingTop: '10px'
            }}>
                <span>{data.footer.issuedAt}</span>
                <span>{data.footer.signature}</span>
            </div>
        </div>
    );
};

export default MissionDocumentTable;