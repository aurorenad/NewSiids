import React, { useState } from 'react';

export const ClaimForm = () => {
    const [text, setText] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            setAttachment(file);
            setError('');
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
    };

    const handleSubmit = async () => {
        if (!text.trim()) {
            setError('Please enter a description for the report');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('description', text);

            if (attachment) {
                formData.append('attachment', attachment);
            }

            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Employee-Id': localStorage.getItem('employeeId') || 'EMP001' // Replace with actual employee ID
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                setSuccess('Report submitted successfully!');
                setText('');
                setAttachment(null);

                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = '/intelligence-officer';
                }, 2000);
            } else {
                throw new Error('Failed to submit report');
            }
        } catch (err) {
            setError('Failed to submit report. Please try again.');
            console.error('Error submitting report:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        window.location.href = '/intelligence-officer';
    };

    return (
        <div className="claim-form-wrapper">
            <div className="claim-form-container">
                <div className="claim-form-header">
                    <h2 className="claim-form-title">Intelligence Office Report</h2>
                    <button className="close-button" onClick={handleCancel}>
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        {success}
                    </div>
                )}

                <div className="textarea-container">
                    <textarea
                        className="claim-textarea"
                        placeholder="Add detailed description of the report..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={8}
                        disabled={isSubmitting}
                    />
                    <div className="character-count">
                        {text.length} characters
                    </div>
                </div>

                <div className="attachment-section">
                    <input
                        type="file"
                        id="file-input"
                        className="file-input"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        disabled={isSubmitting}
                    />

                    <label htmlFor="file-input" className="file-label">
                        <span className="attach-icon">📎</span>
                        <span>Add attachment</span>
                    </label>

                    {attachment && (
                        <div className="attachment-preview">
                            <span className="attachment-name">{attachment.name}</span>
                            <span className="attachment-size">
                                ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                            <button
                                className="remove-attachment"
                                onClick={removeAttachment}
                                disabled={isSubmitting}
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                <div className="form-buttons">
                    <button
                        className="send-button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !text.trim()}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="loading-spinner"></span>
                                <span>Sending...</span>
                            </>
                        ) : (
                            'Send Report'
                        )}
                    </button>

                    <button
                        className="discard-button"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            <style jsx>{`
                .claim-form-wrapper {
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                }

                .claim-form-container {
                    background: white;
                    border-radius: 12px;
                    padding: 32px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e1e5e9;
                }

                .claim-form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                    border-bottom: 2px solid #f0f2f5;
                    padding-bottom: 20px;
                }

                .claim-form-title {
                    margin: 0;
                    color: #1c1e21;
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }

                .close-button {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #8a8d91;
                    padding: 8px;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                }

                .close-button:hover {
                    background: #f0f2f5;
                    color: #1c1e21;
                }

                .alert {
                    padding: 16px 20px;
                    border-radius: 8px;
                    margin-bottom: 24px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                }

                .alert-error {
                    background: #ffebee;
                    color: #c62828;
                    border-left: 4px solid #c62828;
                }

                .alert-success {
                    background: #e8f5e8;
                    color: #2e7d32;
                    border-left: 4px solid #2e7d32;
                }

                .textarea-container {
                    margin-bottom: 24px;
                    position: relative;
                }

                .claim-textarea {
                    width: 100%;
                    min-height: 200px;
                    border: 2px solid #e4e6ea;
                    border-radius: 12px;
                    padding: 20px;
                    font-family: inherit;
                    font-size: 16px;
                    line-height: 1.6;
                    resize: vertical;
                    box-sizing: border-box;
                    transition: border-color 0.2s ease;
                }

                .claim-textarea:focus {
                    outline: none;
                    border-color: #1877f2;
                    box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.1);
                }

                .claim-textarea:disabled {
                    background-color: #f7f8fa;
                    color: #8a8d91;
                    cursor: not-allowed;
                }

                .character-count {
                    position: absolute;
                    bottom: 12px;
                    right: 16px;
                    font-size: 13px;
                    color: #8a8d91;
                    background: rgba(255, 255, 255, 0.9);
                    padding: 4px 8px;
                    border-radius: 4px;
                    backdrop-filter: blur(4px);
                }

                .attachment-section {
                    margin-bottom: 32px;
                    padding: 24px;
                    background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
                    border-radius: 12px;
                    border: 2px dashed #c5cae9;
                    transition: all 0.3s ease;
                }

                .attachment-section:hover {
                    border-color: #9c27b0;
                    background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
                }

                .file-input {
                    display: none;
                }

                .file-label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    color: #1877f2;
                    font-weight: 600;
                    font-size: 16px;
                    transition: color 0.2s ease;
                }

                .file-label:hover {
                    color: #166fe5;
                }

                .attach-icon {
                    font-size: 20px;
                    transform: rotate(-45deg);
                }

                .attachment-preview {
                    margin-top: 16px;
                    padding: 16px 20px;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e4e6ea;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                }

                .attachment-name {
                    flex: 1;
                    font-weight: 600;
                    color: #1c1e21;
                }

                .attachment-size {
                    color: #8a8d91;
                    font-size: 14px;
                    font-weight: 500;
                }

                .remove-attachment {
                    background: #ff5722;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s ease;
                }

                .remove-attachment:hover:not(:disabled) {
                    background: #e64a19;
                }

                .form-buttons {
                    display: flex;
                    gap: 16px;
                    justify-content: flex-end;
                }

                .send-button {
                    background: linear-gradient(135deg, #1877f2 0%, #166fe5 100%);
                    color: white;
                    border: none;
                    padding: 16px 32px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);
                }

                .send-button:hover:not(:disabled) {
                    background: linear-gradient(135deg, #166fe5 0%, #1565c0 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(24, 119, 242, 0.4);
                }

                .send-button:disabled {
                    background: #bdc3c7;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .discard-button {
                    background: transparent;
                    color: #8a8d91;
                    border: 2px solid #e4e6ea;
                    padding: 16px 32px;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .discard-button:hover:not(:disabled) {
                    background: #f7f8fa;
                    border-color: #c5cae9;
                    color: #1c1e21;
                    transform: translateY(-1px);
                }

                .discard-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .loading-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .claim-form-wrapper {
                        padding: 12px;
                    }
                    
                    .claim-form-container {
                        padding: 20px;
                    }
                    
                    .form-buttons {
                        flex-direction: column;
                    }
                    
                    .send-button, .discard-button {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
};