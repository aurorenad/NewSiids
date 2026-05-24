import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CaseService } from '../../api/Axios/caseApi.jsx';
import { AuthContext } from '../../context/AuthContext';
import caseApi from '../../api/Axios/caseApi.jsx';
import { Box, Paper, Typography, TextField, MenuItem, Button, Grid, InputAdornment, CircularProgress, IconButton } from '@mui/material';
import { ArrowBack, Save, Search, Person, Info, ContactPage, HistoryEdu } from '@mui/icons-material';
import { toast } from 'sonner';

const NewSurveillenceCase = () => {
    const { authState } = useContext(AuthContext);
    const location = useLocation();
    const editData = location.state?.caseData;

    const [formData, setFormData] = useState({
        tin: editData?.taxPayer?.tin || '',
        taxPayerName: editData?.taxPayer?.name || '',
        taxType: editData?.taxType || 'None',
        taxPayerAddress: editData?.taxPayer?.address || '',
        taxPeriod: editData?.taxPeriod || '',
        reportedDate: editData?.createdAt ? new Date(editData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        summaryOfInformationCase: editData?.summaryOfInformationCase || '',
        caseSource: editData?.informer ? 'identified' : (editData?.referringDepartment ? 'referred' : 'anonymous'),
        informerId: editData?.informer?.nationalId || '',
        informerName: editData?.informer?.name || '',
        referringOfficerId: editData?.referringDepartment || '',
        referringOfficerName: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearchingTaxPayer, setIsSearchingTaxPayer] = useState(false);
    const [isSearchingInformer, setIsSearchingInformer] = useState(false);
    const [isSearchingReferringOfficer, setIsSearchingReferringOfficer] = useState(false);
    const [referringOfficerError, setReferringOfficerError] = useState('');
    const navigate = useNavigate();

    const taxPayerTypes = ['None','PAYEE','VAT','Income Tax','Corporate Tax','Withholding Tax','Property Tax',
        'Capital gains','Consumption Tax','Immovable Property Tax', 'Payroll Tax', 'Trading Tax'];

    const caseSources = [
        { value: 'anonymous', label: 'Anonymous Source' },
        { value: 'referred', label: 'Referred by Dept/Officer' },
        { value: 'identified', label: 'Identified Informer' }
    ];

    // Load case data if in edit mode
    useEffect(() => {
        if (location.state?.caseData) {
            const { caseData } = location.state;
            const caseSource = caseData.informer ? 'identified' :
                caseData.referringDepartment ? 'referred' : 'anonymous';

            setFormData({
                tin: caseData.taxPayer?.tin || '',
                taxPayerName: caseData.taxPayer?.name || '',
                taxType: caseData.taxType || 'None',
                taxPayerAddress: caseData.taxPayer?.address || '',
                taxPeriod: caseData.taxPeriod || '',
                reportedDate: caseData.createdAt ? new Date(caseData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                summaryOfInformationCase: caseData.summaryOfInformationCase || '',
                caseSource: caseSource,
                informerId: caseData.informer?.nationalId || '',
                informerName: caseData.informer?.name || '',
                referringOfficerId: caseData.referringDepartment || '',
                referringOfficerName: ''
            });
            
            // If it's a referred case, try to look up the officer name
            if (caseSource === 'referred' && caseData.referringDepartment) {
                lookupReferringOfficer(caseData.referringDepartment);
            }
        }
    }, [location.state]);

    const lookupReferringOfficer = async (id) => {
        if (!id) return;
        setIsSearchingReferringOfficer(true);
        try {
            const response = await caseApi.get(`/api/employees/${id.trim()}`);
            if (response.data) {
                setFormData(prev => ({
                    ...prev,
                    referringOfficerName: `${response.data.givenName} ${response.data.familyName}`.trim()
                }));
            }
        } catch (error) {
            console.error('Error fetching referring officer:', error);
        } finally {
            setIsSearchingReferringOfficer(false);
        }
    };

    // Tax payer lookup by TIN
    const handleTinChange = async (e) => {
        const { value } = e.target;
        handleChange(e);

        if (value.length >= 3) {
            setIsSearchingTaxPayer(true);
            try {
                const response = await caseApi.get(`/api/taxpayers/tin/${value}`);
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        taxPayerName: response.data.taxPayerName || prev.taxPayerName,
                        taxPayerAddress: response.data.taxPayerAddress || prev.taxPayerAddress
                    }));
                }
            } catch (error) {
                console.error('Error fetching tax payer:', error);
            } finally {
                setIsSearchingTaxPayer(false);
            }
        }
    };

    const handleInformerIdChange = async (e) => {
        const { value } = e.target;
        handleChange(e);

        if (value.length >= 5) {
            setIsSearchingInformer(true);
            try {
                const response = await caseApi.get(`/api/informers/${value}`);
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        informerName: response.data.informerName || prev.informerName
                    }));
                }
            } catch (error) {
                console.error('Error fetching informer:', error);
            } finally {
                setIsSearchingInformer(false);
            }
        }
    };

    const handleReferringOfficerChange = async (e) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, referringOfficerId: value, referringOfficerName: '' }));
        setReferringOfficerError('');

        if (value && value.trim().length >= 3) {
            setIsSearchingReferringOfficer(true);
            try {
                const response = await caseApi.get(`/api/employees/${value.trim()}`);
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        referringOfficerName: `${response.data.givenName} ${response.data.familyName}`.trim()
                    }));
                } else {
                    setReferringOfficerError('Employee not found');
                }
            } catch (error) {
                setReferringOfficerError('Employee not found');
            } finally {
                setIsSearchingReferringOfficer(false);
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.tin || !formData.taxPayerName || !formData.summaryOfInformationCase) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const caseData = {
                tin: formData.tin,
                taxPayerName: formData.taxPayerName,
                taxType: formData.taxType,
                taxPayerAddress: formData.taxPayerAddress,
                taxPeriod: formData.taxPeriod,
                reportedDate: new Date(formData.reportedDate).toISOString(),
                summaryOfInformationCase: formData.summaryOfInformationCase,
                informerType: formData.caseSource === 'anonymous' ? 'anonymous' : 'identified',
                informerNationalId: formData.caseSource === 'identified' ? formData.informerId : null,
                informerName: formData.caseSource === 'identified' ? formData.informerName : null,
                informerPhoneNum: '',
                informerAddress: '',
                informerEmail: '',
                referringDepartment: formData.caseSource === 'referred' ? formData.referringOfficerId : null,
            };

            let response;
            if (editData?.id) {
                response = await CaseService.updateCase(editData.id, caseData);
                toast.success('Surveillance case updated successfully!');
            } else {
                response = await CaseService.createCase(caseData);
                toast.success('Surveillance case created successfully!');
            }

            if (response.data) {
                setTimeout(() => navigate('/surveillence-officer'), 1500);
            }
        } catch (err) {
            console.error('Error saving case:', err);
            const message = err.response?.data?.message || 'Failed to save case. Please check your data and try again.';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: 4, minHeight: '100vh', bgcolor: 'var(--surface-page)' }}>
            <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f5f5f5' } }}>
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h4" fontWeight={700} color="var(--gray-900)">
                            {editData ? 'Edit Case' : 'New Surveillance Case'}
                        </Typography>
                        <Typography variant="body1" color="var(--gray-500)">
                            {editData ? `Updating case ref: ${editData.caseNum}` : 'Record a new intelligence report or surveillance case'}
                        </Typography>
                    </Box>
                </Box>

                <Paper sx={{ 
                    p: 4, 
                    borderRadius: 4, 
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
                }}>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={4}>
                            {/* Section: Taxpayer Information */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    <ContactPage fontSize="small" /> Taxpayer Information
                                </Typography>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Taxpayer TIN"
                                    name="tin"
                                    value={formData.tin}
                                    onChange={handleTinChange}
                                    required
                                    InputProps={{
                                        endAdornment: isSearchingTaxPayer && (
                                            <InputAdornment position="end">
                                                <CircularProgress size={20} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Taxpayer Name"
                                    name="taxPayerName"
                                    value={formData.taxPayerName}
                                    onChange={handleChange}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Tax Type"
                                    name="taxType"
                                    value={formData.taxType}
                                    onChange={handleChange}
                                >
                                    {taxPayerTypes.map(type => (
                                        <MenuItem key={type} value={type}>{type}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Tax Period"
                                    name="taxPeriod"
                                    value={formData.taxPeriod}
                                    onChange={handleChange}
                                    placeholder="e.g. FY 2023"
                                />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Reported Date"
                                    name="reportedDate"
                                    value={formData.reportedDate}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Taxpayer Address"
                                    name="taxPayerAddress"
                                    value={formData.taxPayerAddress}
                                    onChange={handleChange}
                                    multiline
                                    rows={1}
                                />
                            </Grid>

                            {/* Section: Source Information */}
                            <Grid item xs={12} sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    <Info fontSize="small" /> Intelligence Source
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Case Source"
                                    name="caseSource"
                                    value={formData.caseSource}
                                    onChange={(e) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            caseSource: e.target.value,
                                            informerId: '',
                                            informerName: '',
                                            referringOfficerId: '',
                                            referringOfficerName: '',
                                        }));
                                    }}
                                >
                                    {caseSources.map(source => (
                                        <MenuItem key={source.value} value={source.value}>{source.label}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {formData.caseSource === 'identified' && (
                                <>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Informer ID"
                                            name="informerId"
                                            value={formData.informerId}
                                            onChange={handleInformerIdChange}
                                            required
                                            InputProps={{
                                                endAdornment: isSearchingInformer && (
                                                    <InputAdornment position="end">
                                                        <CircularProgress size={20} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Informer Name"
                                            name="informerName"
                                            value={formData.informerName}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                </>
                            )}

                            {formData.caseSource === 'referred' && (
                                <>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Referring Officer ID"
                                            name="referringOfficerId"
                                            value={formData.referringOfficerId}
                                            onChange={handleReferringOfficerChange}
                                            error={!!referringOfficerError}
                                            helperText={referringOfficerError}
                                            required
                                            InputProps={{
                                                endAdornment: isSearchingReferringOfficer && (
                                                    <InputAdornment position="end">
                                                        <CircularProgress size={20} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Referring Officer Name"
                                            value={formData.referringOfficerName}
                                            disabled
                                            placeholder="Officer name will appear here"
                                        />
                                    </Grid>
                                </>
                            )}

                            {/* Section: Case Summary */}
                            <Grid item xs={12} sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--rra-blue)', mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    <HistoryEdu fontSize="small" /> Case Summary
                                </Typography>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Summary of Information Provided"
                                    name="summaryOfInformationCase"
                                    value={formData.summaryOfInformationCase}
                                    onChange={handleChange}
                                    required
                                    multiline
                                    rows={5}
                                    placeholder="Provide detailed information about the intelligence or case..."
                                />
                            </Grid>

                            {/* Buttons */}
                            <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button 
                                    variant="outlined" 
                                    onClick={() => navigate(-1)}
                                    disabled={isSubmitting}
                                    sx={{ borderRadius: 2, px: 4 }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    variant="contained" 
                                    disabled={isSubmitting}
                                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                    sx={{ 
                                        borderRadius: 2, 
                                        px: 6, 
                                        bgcolor: 'var(--rra-blue)',
                                        '&:hover': { bgcolor: 'var(--rra-blue-dark)' }
                                    }}
                                >
                                    {isSubmitting ? 'Processing...' : (editData ? 'Save Changes' : 'Create Case')}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                </Paper>
            </Box>
        </Box>
    );
};

export default NewSurveillenceCase;