import React, { useState } from 'react';
import './../Styles/ClaimForm.css';
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CancelIcon from '@mui/icons-material/Cancel';
import { IconButton } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { ReportApi } from '../api/Axios/caseApi';

export const SClaimForm = () => {
    const [text, setText] = useState('');
    const { caseNum } = useParams(); // Get the case number from URL params



    return (
        <div className="claim-form-wrapper">
            <div className="claim-form-container">
                <div className="claim-form-header">
                    <h2 className="claim-form-title">Surveillance Office Report for Case #{caseNum}</h2>
                    <div className="claim-form-actions">
                        <Link to={'/surveillence-officer'}>
                            <IconButton>
                                <CancelIcon color='error'/>
                            </IconButton>
                        </Link>
                    </div>
                </div>

                <div className="textarea-container">
                    <textarea
                        className="claim-textarea"
                        placeholder="Enter your report details here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                <div className="attachment-info">
                    <IconButton>
                        <AttachFileIcon />
                        Add attachment
                    </IconButton>
                </div>

                <div className="form-buttons">
                    <button className="send-button" onClick={handleSubmit}>
                        Submit Report
                    </button>
                    <Link to={`/surveillence-officer`}>
                        <button className="discard-button">Cancel</button>
                    </Link>
                </div>
            </div>
        </div>
    );
};