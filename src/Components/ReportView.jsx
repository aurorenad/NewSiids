import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Divider,
    Chip,
    Avatar,
    Button,
    IconButton,
    Stack,
    Paper,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Print,
    Download,
    Edit,
    CheckCircle,
    Schedule,
    LocationOn,
    Person,
    CalendarToday,
    AttachMoney,
    DirectionsCar,
} from '@mui/icons-material';

const ReportView = () => {
    const [editDialog, setEditDialog] = useState(false);
    const [reportData, setReportData] = useState({
        missionReference: '000068/25',
        date: '03-10-2024',
        employeeName: 'UWITONZE JEAN PAULIN',
        title: 'Assistant Commissioner in charge of Taxpayers Service and Communication Division',
        purpose: 'Field inspection and taxpayer consultation',
        expectedResults: 'Enhanced taxpayer compliance and service delivery',
        proposedBy: 'MURASI INNOCENTE',
        destination: 'Nyaruguru',
        departurePlace: 'Kicukiro',
        departureDate: '03-10-2024',
        returnDate: '06-10-2024',
        duration: '4 Days, 3 Nights',
        transport: 'Private car (RAF456A)',
        allowance: '140,400',
        totalAmount: '140,400',
        status: 'Approved',
        arrivalTime: '09:30 AM',
        departureTime: '04:15 PM'
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'success';
            case 'Pending': return 'warning';
            case 'Rejected': return 'error';
            default: return 'default';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('rw-RW', {
            style: 'currency',
            currency: 'RWF',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 3,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    color: 'white',
                    borderRadius: 2
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                        <Person fontSize="large" />
                    </Avatar>
                    <Box flex={1}>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            RWANDA REVENUE AUTHORITY
                        </Typography>
                        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                            TAXES FOR GROWTH AND DEVELOPMENT
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <IconButton sx={{ color: 'white' }} onClick={() => window.print()}>
                            <Print />
                        </IconButton>
                        <IconButton sx={{ color: 'white' }}>
                            <Download />
                        </IconButton>
                        <Button
                            variant="outlined"
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.5)',
                                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                            }}
                            startIcon={<Edit />}
                            onClick={() => setEditDialog(true)}
                        >
                            Edit
                        </Button>
                    </Stack>
                </Stack>

                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Typography variant="h5" fontWeight="600" gutterBottom>
                            Travel Clearance Report
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                            Mission Reference: {reportData.missionReference}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4} textAlign="right">
                        <Chip
                            icon={<CheckCircle />}
                            label={reportData.status}
                            color={getStatusColor(reportData.status)}
                            sx={{ mb: 1, fontWeight: 'bold' }}
                        />
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Issued: {reportData.date}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            <Grid container spacing={3}>
                {/* Employee Information */}
                <Grid item xs={12} md={6}>
                    <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                                <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}>
                                    <Person />
                                </Avatar>
                                <Typography variant="h6" fontWeight="600">
                                    Employee Information
                                </Typography>
                            </Stack>

                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Full Name
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        {reportData.employeeName}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Position
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        {reportData.title}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Mission Proposed By
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        {reportData.proposedBy}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Mission Details */}
                <Grid item xs={12} md={6}>
                    <Card elevation={2} sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                                <Avatar sx={{ bgcolor: '#fff3e0', color: '#f57c00' }}>
                                    <LocationOn />
                                </Avatar>
                                <Typography variant="h6" fontWeight="600">
                                    Mission Details
                                </Typography>
                            </Stack>

                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Purpose
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        {reportData.purpose}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Expected Results
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        {reportData.expectedResults}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Destination
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        {reportData.destination}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Travel Information */}
                <Grid item xs={12} md={8}>
                    <Card elevation={2} sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                                <Avatar sx={{ bgcolor: '#f3e5f5', color: '#7b1fa2' }}>
                                    <CalendarToday />
                                </Avatar>
                                <Typography variant="h6" fontWeight="600">
                                    Travel Information
                                </Typography>
                            </Stack>

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Departure
                                        </Typography>
                                        <Typography variant="body1" fontWeight="500">
                                            {reportData.departurePlace}
                                        </Typography>
                                        <Typography variant="body2" color="primary">
                                            {reportData.departureDate} at {reportData.arrivalTime}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Return
                                        </Typography>
                                        <Typography variant="body1" fontWeight="500">
                                            {reportData.destination}
                                        </Typography>
                                        <Typography variant="body2" color="primary">
                                            {reportData.returnDate} at {reportData.departureTime}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Duration
                                        </Typography>
                                        <Chip
                                            icon={<Schedule />}
                                            label={reportData.duration}
                                            variant="outlined"
                                            color="primary"
                                        />
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Transport
                                        </Typography>
                                        <Chip
                                            icon={<DirectionsCar />}
                                            label={reportData.transport}
                                            variant="outlined"
                                            color="secondary"
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Financial Summary */}
                <Grid item xs={12} md={4}>
                    <Card elevation={2} sx={{ borderRadius: 2, bgcolor: '#f8f9fa' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                                <Avatar sx={{ bgcolor: '#e8f5e8', color: '#2e7d32' }}>
                                    <AttachMoney />
                                </Avatar>
                                <Typography variant="h6" fontWeight="600">
                                    Financial Summary
                                </Typography>
                            </Stack>

                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Mission Allowance
                                    </Typography>
                                    <Typography variant="h5" color="primary" fontWeight="bold">
                                        {formatCurrency(reportData.allowance)}
                                    </Typography>
                                </Box>

                                <Divider />

                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Transport/Mileage
                                    </Typography>
                                    <Typography variant="body1" fontWeight="500">
                                        Included
                                    </Typography>
                                </Box>

                                <Divider />

                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Total Amount
                                    </Typography>
                                    <Typography variant="h4" color="success.main" fontWeight="bold">
                                        {formatCurrency(reportData.totalAmount)}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Footer */}
            <Paper elevation={0} sx={{ mt: 4, p: 2, bgcolor: 'transparent', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    Kicukiro-Sonatube-Silverback Mall, P.O.Box 3987 Kigali, Rwanda
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    📞 3004 | 🌐 www.rra.gov.rw | 📧 @rrainfo
                </Typography>
                <Typography variant="body2" color="primary" fontWeight="500" sx={{ mt: 1 }}>
                    HERE FOR YOU TO SERVE
                </Typography>
            </Paper>

            {/* Edit Dialog */}
            <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit Mission Report</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Employee Name"
                                value={reportData.employeeName}
                                onChange={(e) => setReportData({...reportData, employeeName: e.target.value})}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Destination"
                                value={reportData.destination}
                                onChange={(e) => setReportData({...reportData, destination: e.target.value})}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Purpose"
                                value={reportData.purpose}
                                onChange={(e) => setReportData({...reportData, purpose: e.target.value})}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Departure Date"
                                type="date"
                                value={reportData.departureDate}
                                onChange={(e) => setReportData({...reportData, departureDate: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Return Date"
                                type="date"
                                value={reportData.returnDate}
                                onChange={(e) => setReportData({...reportData, returnDate: e.target.value})}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={() => setEditDialog(false)}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReportView;