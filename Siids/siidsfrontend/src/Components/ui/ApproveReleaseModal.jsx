import React, { useState } from 'react';
import { 
  Box, Typography, Button, TextField, InputAdornment, 
  CircularProgress, Divider 
} from '@mui/material';
import { CheckCircle, Person, MonetizationOn, Gavel } from '@mui/icons-material';
import Portal from './Portal';

const ApproveReleaseModal = ({ isOpen, onClose, onConfirm, seizureNumber }) => {
  const [formData, setFormData] = useState({
    auctionWinner: '',
    auctionAmount: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.auctionWinner || !formData.auctionAmount) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm({
        winner: formData.auctionWinner,
        amount: parseFloat(formData.auctionAmount)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '24px 24px 16px', textAlign: 'center', background: 'rgba(0, 154, 68, 0.05)' }}>
             <CheckCircle sx={{ fontSize: 48, color: '#009A44', mb: 1 }} />
             <Typography variant="h6" fontWeight={700}>Approve Goods Release</Typography>
             <Typography variant="caption" color="var(--gray-500)">
               Authorize final release for Reference: <strong>{seizureNumber}</strong>
             </Typography>
          </div>
          
          <form onSubmit={handleSubmit}>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="body2" color="var(--gray-600)" sx={{ mb: 1 }}>
                    Please provide the details of the final disposal / auction result below.
                </Typography>

                <TextField
                    fullWidth
                    label="Disposal Recipient / Auction Winner"
                    required
                    value={formData.auctionWinner}
                    onChange={e => setFormData({ ...formData, auctionWinner: e.target.value })}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment>
                    }}
                />

                <TextField
                    fullWidth
                    label="Final Proceeds / Auction Amount"
                    type="number"
                    required
                    value={formData.auctionAmount}
                    onChange={e => setFormData({ ...formData, auctionAmount: e.target.value })}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><MonetizationOn fontSize="small" /></InputAdornment>,
                        endAdornment: <InputAdornment position="end">RWF</InputAdornment>
                    }}
                />
            </Box>

            <Divider />

            <Box sx={{ p: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', bgcolor: '#f9fafb' }}>
              <Button onClick={onClose} disabled={isSubmitting} variant="outlined" sx={{ borderRadius: 2 }}>Cancel</Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="success"
                disabled={isSubmitting || !formData.auctionWinner || !formData.auctionAmount}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Gavel />}
                sx={{ borderRadius: 2, bgcolor: '#009A44', '&:hover': { bgcolor: '#007A37' } }}
              >
                {isSubmitting ? 'Authorizing...' : 'Authorize Release'}
              </Button>
            </Box>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default ApproveReleaseModal;
