import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, InputAdornment, 
  CircularProgress, Divider, MenuItem, Grid, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, FormControl, InputLabel, Select
} from '@mui/material';
import { 
  Share, Person, MonetizationOn, LocalPhone, Badge, 
  Gavel, DeleteForever, Category, Description, Close 
} from '@mui/icons-material';

const RequestReleaseModal = ({ isOpen, onClose, onConfirm, seizureNumber }) => {
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientIdPassport: '',
    recipientPhone: '',
    auctionAmount: '',
    releaseDestination: 'Auction',
    releaseReason: '',
    goodsTypeForDestruction: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[RequestReleaseModal] Modal opened, resetting form state.');
      setFormData({
        recipientName: '',
        recipientIdPassport: '',
        recipientPhone: '',
        auctionAmount: '',
        releaseDestination: 'Auction',
        releaseReason: '',
        goodsTypeForDestruction: ''
      });
    }
  }, [isOpen]);

  const isAuction = formData.releaseDestination === 'Auction';
  const isDestruction = formData.releaseDestination === 'Destruction';

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[RequestReleaseModal] Submitting form...', formData);
    
    if (isAuction) {
        if (!formData.recipientName || !formData.auctionAmount || !formData.releaseReason) {
            console.warn('[RequestReleaseModal] Validation failed for Auction');
            return;
        }
    } else if (isDestruction) {
        if (!formData.releaseReason || !formData.goodsTypeForDestruction) {
            console.warn('[RequestReleaseModal] Validation failed for Destruction');
            return;
        }
    }
    
    setIsSubmitting(true);
    try {
      const submissionData = {
        ...formData,
        recipientName: isAuction ? formData.recipientName : 'N/A (Formal Destruction)',
        recipientIdPassport: isAuction ? formData.recipientIdPassport : 'N/A',
        recipientPhone: isAuction ? formData.recipientPhone : 'N/A',
        auctionAmount: isAuction ? (parseFloat(formData.auctionAmount) || 0) : 0.0,
        releaseReason: isAuction 
            ? formData.releaseReason 
            : `Goods Type: ${formData.goodsTypeForDestruction} | Process: ${formData.releaseReason}`
      };
      await onConfirm(submissionData);
    } catch (err) {
        console.error('[RequestReleaseModal] Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={Boolean(isOpen)} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
      disableEnforceFocus={false}
      // Force high z-index and ensure it's on top
      sx={{ zIndex: 9999 }}
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'visible' }
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        textAlign: 'center', 
        background: isAuction ? 'rgba(0, 61, 165, 0.05)' : 'rgba(239, 68, 68, 0.05)',
        borderBottom: '1px solid',
        borderColor: isAuction ? 'rgba(0, 61, 165, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        position: 'relative',
        borderTopLeftRadius: 'inherit',
        borderTopRightRadius: 'inherit'
      }}>
         <IconButton 
            onClick={onClose} 
            sx={{ position: 'absolute', right: 8, top: 8, color: 'var(--gray-400)' }}
         >
            <Close fontSize="small" />
         </IconButton>

         {isAuction ? (
             <Share sx={{ fontSize: 48, color: 'var(--rra-blue)', mb: 1 }} />
         ) : (
             <DeleteForever sx={{ fontSize: 48, color: 'var(--rra-red)', mb: 1 }} />
         )}
         <Typography variant="h6" fontWeight={700}>
            {isAuction ? 'Request Goods Release' : 'Request Goods Destruction'}
         </Typography>
         <Typography variant="caption" color="var(--gray-500)">
           Ref: <strong>{seizureNumber || 'N/A'}</strong>
         </Typography>
      </Box>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <DialogContent sx={{ p: 3, overflowY: 'visible' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* 1. Method Selection - Standard Select for better responsiveness */}
                <FormControl fullWidth size="small" required>
                    <InputLabel id="release-destination-label">Disposal Method</InputLabel>
                    <Select
                        labelId="release-destination-label"
                        label="Disposal Method"
                        value={formData.releaseDestination}
                        onChange={e => setFormData({ ...formData, releaseDestination: e.target.value })}
                        MenuProps={{ style: { zIndex: 10001 } }} // Ensure menu is above dialog
                    >
                        <MenuItem value="Auction">Public Auction Disposal</MenuItem>
                        <MenuItem value="Destruction">Formal Destruction</MenuItem>
                    </Select>
                </FormControl>

                <Divider />

                {/* DYNAMIC CONTENT */}
                {isAuction && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Auction Winner Name"
                                required
                                size="small"
                                value={formData.recipientName}
                                onChange={e => setFormData({ ...formData, recipientName: e.target.value })}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="National ID / Passport"
                                required
                                size="small"
                                value={formData.recipientIdPassport}
                                onChange={e => setFormData({ ...formData, recipientIdPassport: e.target.value })}
                                InputProps={{ startAdornment: <InputAdornment position="start"><Badge fontSize="small" /></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                required
                                size="small"
                                value={formData.recipientPhone}
                                onChange={e => setFormData({ ...formData, recipientPhone: e.target.value })}
                                InputProps={{ startAdornment: <InputAdornment position="start"><LocalPhone fontSize="small" /></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Final Amount Paid (RWF)"
                                type="number"
                                required
                                size="small"
                                value={formData.auctionAmount}
                                onChange={e => setFormData({ ...formData, auctionAmount: e.target.value })}
                                InputProps={{ startAdornment: <InputAdornment position="start"><MonetizationOn fontSize="small" /></InputAdornment> }}
                            />
                        </Grid>
                    </Grid>
                )}

                {isDestruction && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Goods Category"
                                placeholder="e.g. Expired Food"
                                required
                                size="small"
                                value={formData.goodsTypeForDestruction}
                                onChange={e => setFormData({ ...formData, goodsTypeForDestruction: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                )}

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label={isAuction ? "Release Justification" : "Destruction Process Description"}
                        multiline
                        rows={3}
                        required
                        size="small"
                        value={formData.releaseReason}
                        onChange={e => setFormData({ ...formData, releaseReason: e.target.value })}
                    />
                </Grid>
            </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, bgcolor: '#f9fafb' }}>
          <Button onClick={onClose} disabled={isSubmitting} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Gavel />}
            sx={{ 
                borderRadius: 2, 
                textTransform: 'none',
                px: 4,
                bgcolor: isAuction ? 'var(--rra-blue)' : 'var(--rra-red)', 
                '&:hover': { bgcolor: isAuction ? 'var(--rra-blue-dark)' : '#b91c1c' } 
            }}
          >
            {isSubmitting ? 'Processing...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RequestReleaseModal;
