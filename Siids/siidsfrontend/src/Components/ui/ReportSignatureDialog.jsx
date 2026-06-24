import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import { ReportApi } from '../../api/Axios/caseApi.jsx';

const stripPngDataPrefix = (signatureDataUrl) =>
    signatureDataUrl.replace(/^data:image\/png;base64,/, '');

const readImageAsPngBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            resolve(stripPngDataPrefix(canvas.toDataURL('image/png')));
        };
        image.onerror = () => reject(new Error('Failed to read signature image.'));
        image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Failed to read signature image.'));
    reader.readAsDataURL(file);
});

const ReportSignatureDialog = ({ open, report, role, title, onClose, onSigned }) => {
    const signatureRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [uploadedSignatureBase64, setUploadedSignatureBase64] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setUploadedSignatureBase64('');
        setUploadedFileName('');
        window.setTimeout(() => signatureRef.current?.clear(), 0);
    }, [open, report?.id, role]);

    const handleClear = () => {
        signatureRef.current?.clear();
        setUploadedSignatureBase64('');
        setUploadedFileName('');
        setError('');
    };

    const handleSignatureUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please attach a signature image.');
            return;
        }

        try {
            const signatureBase64 = await readImageAsPngBase64(file);
            setUploadedSignatureBase64(signatureBase64);
            setUploadedFileName(file.name);
            signatureRef.current?.clear();
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to attach signature image.');
        }
    };

    const handleSign = async () => {
        if (!report?.id) {
            setError('No report selected for signing.');
            return;
        }

        if (!uploadedSignatureBase64 && (!signatureRef.current || signatureRef.current.isEmpty())) {
            setError('Please draw or attach your signature before submitting.');
            return;
        }

        try {
            setSaving(true);
            setError('');
            const signatureBase64 = uploadedSignatureBase64 || stripPngDataPrefix(signatureRef.current.toDataURL('image/png'));
            const response = await ReportApi.signReport(report.id, signatureBase64, role);
            onSigned?.(response.data);
            onClose?.();
        } catch (err) {
            const message = err.response?.data?.message || err.response?.data || 'Failed to sign report.';
            setError(typeof message === 'string' ? message : 'Failed to sign report.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={(e, reason) => {
                if (reason !== 'backdropClick' && !saving) {
                    onClose?.();
                }
            }} 
            fullWidth 
            maxWidth="sm"
            disableEnforceFocus
            disableRestoreFocus
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Report ID: <strong>{report?.id || '-'}</strong>
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: '#fff',
                        height: { xs: 180, sm: 220 },
                        overflow: 'hidden'
                    }}
                >
                    <SignatureCanvas
                        ref={signatureRef}
                        penColor="#111827"
                        canvasProps={{
                            style: {
                                width: '100%',
                                height: '100%',
                                display: 'block'
                            }
                        }}
                    />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Draw your signature inside the box or attach a signature image. This signature is attached to the generated investigation report PDF.
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                    <Button component="label" variant="outlined" disabled={saving}>
                        Attach Signature
                        <input type="file" hidden accept="image/*" onChange={handleSignatureUpload} />
                    </Button>
                    {uploadedFileName && (
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                            Attached: {uploadedFileName}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button onClick={handleClear} disabled={saving}>
                    Clear
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button onClick={handleSign} variant="contained" disabled={saving}>
                    {saving ? <CircularProgress size={20} color="inherit" /> : 'Sign Report'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReportSignatureDialog;
