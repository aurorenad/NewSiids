import React, { useState } from 'react';
import './../Styles/ClaimForm.css';
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CancelIcon from '@mui/icons-material/Cancel';
import {IconButton} from "@mui/material";
import {Link} from "react-router-dom";
export const SClaimForm = () => {
    const [text, setText] = useState('');

    return (
        <div className="claim-form-wrapper">
            <div className="claim-form-container">
                <div className="claim-form-header">
                    <h2 className="claim-form-title">Surveillance Office report</h2>
                    <div className="claim-form-actions">
                        <Link to={'/intelligence-officer'}>
                            <IconButton >
                                <CancelIcon color='error'/>
                            </IconButton>
                        </Link>
                    </div>
                </div>

                <div className="textarea-container">
                    <textarea
                        className="claim-textarea"
                        placeholder="Add text ..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                <div className="attachment-info">
                    <IconButton >
                        <AttachFileIcon />
                        Add attachment
                    </IconButton>
                </div>

                <div className="form-buttons">
                    <button className="send-button">Send</button>
                    <Link to={`/intelligence-officer`}>
                        <button className="discard-button">Cancel</button></Link>
                </div>
            </div>
        </div>
    );
};
