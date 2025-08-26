import React, { useState } from 'react';
import { Button, ListGroup, Spinner } from 'react-bootstrap';
import html2pdf from "html2pdf.js";

const MissionDocumentTable = ({ data, attachments, onDownloadAttachment, downloading }) => {

    const [generatingPdf, setGeneratingPdf] = useState(false);

    const downloadReportAsPdf = async () => {
        try {
            setGeneratingPdf(true);

            const element = document.getElementById('pdf-content');
            if (!element) {
                throw new Error('Content element not found');
            }

            const filename = `Report_Findings_${data?.header?.reference || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;

            const options = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    letterRendering: true
                },
                jsPDF: {
                    unit: 'in',
                    format: 'a4',
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.page-break-before',
                    after: '.page-break-after'
                }
            };

            await html2pdf().set(options).from(element).save();
        } catch (error) {
            console.error('PDF generation failed:', error);
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div style={{
            height: '100%',
            border: '1px solid #ddd',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: 'white',
            overflow: 'auto',
            marginInline: 'auto',
            width: '80%'
        }}>
            <div className="mt-3">
                <Button
                    variant="primary"
                    onClick={downloadReportAsPdf}
                    disabled={generatingPdf}
                    style={{
                        backgroundColor: "#3b82f6",
                        color: "#fff",
                        border: 'none',
                        width: "100px",
                        height: "50px",
                        borderRadius: "10px"
                    }}
                >
                    {generatingPdf ? 'Generating PDF...' : 'Download PDF'}
                </Button>
            </div>
            <div id="pdf-content">
                <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    borderBottom: '1px solid #ddd',
                    paddingBottom: '10px'
                }}>
                    <img src="./../../public/Images/HomeLogo.jpeg" style={{width:"100px"}}/>
                    <h3 style={{ marginBottom: '5px' }}>

                        {data.header.header1}</h3>
                    <h5 style={{ marginBottom: '5px' }}>{data.header.header2}</h5>
                    <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>{data.header.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em' }}>
                        <span>{data.header.reference}</span>
                        <span>{data.header.date}</span>
                    </div>
                </div>

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
                                            onClick={() => onDownloadAttachment(path)}
                                            disabled={downloading.includes(path)}
                                            style={{ minWidth: '100px' }}
                                        >
                                            {downloading.includes(path) ? (
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
        </div>
    );
};

export default MissionDocumentTable;
