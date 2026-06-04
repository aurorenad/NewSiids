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

const ReportSignatureDialog = ({ open, report, role, title, onClose, onSigned }) => {
    const signatureRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        window.setTimeout(() => signatureRef.current?.clear(), 0);
    }, [open, report?.id, role]);

    const handleClear = () => {
        signatureRef.current?.clear();
        setError('');
    };

    const handleSign = async () => {
        if (!report?.id) {
            setError('No report selected for signing.');
            return;
        }

        if (!signatureRef.current || signatureRef.current.isEmpty()) {
            setError('Please draw your signature before submitting.');
            return;
        }

        try {
            setSaving(true);
            setError('');
            const signatureBase64 = stripPngDataPrefix(signatureRef.current.toDataURL('image/png'));
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
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
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
                    Draw your signature inside the box. This signature is attached to the generated investigation report PDF.
                </Typography>
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
