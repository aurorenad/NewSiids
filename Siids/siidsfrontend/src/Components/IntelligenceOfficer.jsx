import React, { useState, useEffect } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, Paper, Snackbar, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, TextField, Typography, Alert,
    Tooltip, Grid, Card, CardContent, CardHeader, FormControl, InputLabel,
    Select, MenuItem, Divider, Chip, Stack, LinearProgress, Tab, Tabs,
    Avatar, Badge
} from '@mui/material';
import {
    Add as AddIcon, Description as DescriptionIcon, Search as SearchIcon,
    FilterList as FilterListIcon, PictureAsPdf, Edit as EditIcon,
    ArrowUpward, ArrowDownward, Clear as ClearIcon, DateRange as DateRangeIcon,
    TableChart as ExcelIcon, Folder as FolderIcon, Pending as PendingIcon,
    Refresh as RefreshIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon,
    Warning as WarningIcon, Visibility as VisibilityIcon, Download as DownloadIcon,
    ArrowForward as ArrowForwardIcon, NotificationsActive as NotificationsActiveIcon,
    GetApp as GetAppIcon, // Add this import
    Info as InfoIcon, // Add this import
    Close as CloseIcon // Add this import
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CaseService, ReportApi } from '../api/Axios/caseApi';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const IntelligenceOfficer = () => {
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [loading, setLoading] = useState({ cases: true });
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });
    const [showOnlyWithReports, setShowOnlyWithReports] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortOrder, setSortOrder] = useState('desc');
    const [activeTab, setActiveTab] = useState('all');

    // New states for return document functionality
    const [returnDocumentLoading, setReturnDocumentLoading] = useState(new Set());
    const [returnDetailsDialogOpen, setReturnDetailsDialogOpen] = useState(false);
    const [selectedReturnReport, setSelectedReturnReport] = useState(null);
    const [returnDetails, setReturnDetails] = useState(null);

    const [reportDialog, setReportDialog] = useState(false);
    const [reportStats, setReportStats] = useState({
        createdCases: [],
        pendingReviewCases: [],
        returnedCases: [],
        approvedCases: [],
        closedCases: [],
        casesWithReports: [],
        allCases: []
    });

    const [reportFilters, setReportFilters] = useState({
        caseNumber: '',
        taxType: '',
        taxPeriod: '',
        dateFrom: null,
        dateTo: null,
        taxpayerName: '',
        status: '',
        includeDetails: true,
        includeCharts: true
    });
    const [generatedReportData, setGeneratedReportData] = useState(null);
    const [excelGenerating, setExcelGenerating] = useState(false);
    const [returnedCasesCount, setReturnedCasesCount] = useState(0);

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(prev => ({ ...prev, cases: true }));
            const casesResponse = await CaseService.getMyCases();
            const allCases = casesResponse.data;
            setCases(allCases);
            setFilteredCases(allCases);
            categorizeCases(allCases);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data');
            showSnackbar('Failed to load data', 'error');
        } finally {
            setLoading(prev => ({ ...prev, cases: false }));
        }
    };

    const categorizeCases = (casesData) => {
        if (!casesData || casesData.length === 0) {
            setReportStats({
                createdCases: [],
                pendingReviewCases: [],
                returnedCases: [],
                approvedCases: [],
                closedCases: [],
                casesWithReports: [],
                allCases: []
            });
            setReturnedCasesCount(0);
            return;
        }

        // Created Cases (Fresh/new cases)
        const createdCases = casesData.filter(c =>
            c.status === 'CASE_CREATED' ||
            c.status === 'REPORT_SUBMITTED'
        );

        // Pending Cases (Under review)
        const pendingReviewCases = casesData.filter(c =>
            c.status === 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE'
        );

        // Returned Cases (Sent back for revision)
        const returnedCases = casesData.filter(c =>
            c.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' ||
            c.status === 'REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION' ||
            c.status === 'REPORT_RETURNED_ASSISTANT_COMMISSIONER' ||
            c.status === 'REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE'
        );

        // Cases with completed reports
        const casesWithReports = casesData.filter(c =>
            c.reportId && c.status !== 'CASE_CREATED'
        );

        // Approved Cases
        const approvedCases = casesData.filter(c =>
            c.status === 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE' ||
            c.status === 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER' ||
            c.status === 'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION'
        );

        // Closed/Rejected Cases
        const closedCases = casesData.filter(c =>
            c.status === 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE' ||
            c.status === 'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER' ||
            c.status === 'REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION'
        );

        setReportStats({
            createdCases,
            pendingReviewCases,
            returnedCases,
            approvedCases,
            closedCases,
            casesWithReports,
            allCases: casesData
        });

        setReturnedCasesCount(returnedCases.length);
    };

    useEffect(() => {
        let results = [...cases];

        if (searchTerm) {
            results = results.filter(caseItem =>
                Object.values(caseItem).some(
                    value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        if (showOnlyWithReports) {
            results = results.filter(caseItem => caseItem.reportId);
        }

        // Filter by active tab
        switch (activeTab) {
            case 'created':
                results = results.filter(c =>
                    c.status === 'CASE_CREATED' ||
                    c.status === 'REPORT_SUBMITTED'
                );
                break;
            case 'pending':
                results = results.filter(c =>
                    c.status === 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE'
                );
                break;
            case 'returned':
                results = results.filter(c =>
                    c.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' ||
                    c.status === 'REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION' ||
                    c.status === 'REPORT_RETURNED_ASSISTANT_COMMISSIONER' ||
                    c.status === 'REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE'
                );
                break;
            case 'approved':
                results = results.filter(c =>
                    c.status === 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE' ||
                    c.status === 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER' ||
                    c.status === 'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION'
                );
                break;
            case 'closed':
                results = results.filter(c =>
                    c.status === 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE' ||
                    c.status === 'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER' ||
                    c.status === 'REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION'
                );
                break;
            case 'withReports':
                results = results.filter(caseItem => caseItem.reportId);
                break;
            default:
                // 'all' tab - show all cases
                break;
        }

        results.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);

            if (sortOrder === 'desc') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });

        setFilteredCases(results);
        setPage(0);
    }, [searchTerm, cases, showOnlyWithReports, sortOrder, activeTab]);

    // NEW: Check if a report has return document
    const hasReturnDocument = (caseItem) => {
        return caseItem.hasReturnDocument ||
            caseItem.returnDocumentPath ||
            (caseItem.status && isReturnedStatus(caseItem.status) && caseItem.reportId);
    };

    // NEW: Handle download return document
    const handleDownloadReturnDocument = async (reportId) => {
        if (!reportId) {
            showSnackbar('No report ID found', 'warning');
            return;
        }

        setReturnDocumentLoading(prev => new Set(prev).add(reportId));

        try {
            const response = await ReportApi.downloadReturnDocument(reportId);

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Get filename from content-disposition header
            const disposition = response.headers['content-disposition'];
            let filename = 'return-document';
            if (disposition) {
                const filenameMatch = disposition.match(/filename="?(.+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            showSnackbar('Return document downloaded successfully', 'success');
        } catch (err) {
            console.error('Error downloading return document:', err);
            showSnackbar(err.response?.data?.message || 'Failed to download return document', 'error');
        } finally {
            setReturnDocumentLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(reportId);
                return newSet;
            });
        }
    };

    // NEW: Handle viewing return details
    const handleViewReturnDetails = async (caseItem) => {
        if (!caseItem.reportId) {
            showSnackbar('No report found for this case', 'warning');
            return;
        }

        setSelectedReturnReport(caseItem);

        try {
            // Try to fetch detailed report information
            const reportResponse = await ReportApi.getReport(caseItem.reportId);
            const reportDetails = reportResponse.data;

            // Also check edit permission for additional return details
            try {
                const permissionResponse = await ReportApi.checkEditPermission(caseItem.reportId);
                const permissionDetails = permissionResponse.data;

                setReturnDetails({
                    returnReason: caseItem.returnReason || reportDetails.returnReason,
                    returnedBy: caseItem.returnedBy || reportDetails.returnedBy,
                    returnedAt: caseItem.returnedAt || reportDetails.returnedAt,
                    hasReturnDocument: caseItem.hasReturnDocument || reportDetails.hasReturnDocument || permissionDetails.hasReturnDocument,
                    editGuidance: permissionDetails.editGuidance
                });
            } catch (permError) {
                // If permission check fails, use basic details
                setReturnDetails({
                    returnReason: caseItem.returnReason || reportDetails.returnReason,
                    returnedBy: caseItem.returnedBy || reportDetails.returnedBy,
                    returnedAt: caseItem.returnedAt || reportDetails.returnedAt,
                    hasReturnDocument: caseItem.hasReturnDocument || reportDetails.hasReturnDocument,
                    editGuidance: null
                });
            }

            setReturnDetailsDialogOpen(true);
        } catch (error) {
            console.error('Error fetching return details:', error);
            // Show basic info from case item
            setReturnDetails({
                returnReason: caseItem.returnReason,
                returnedBy: caseItem.returnedBy,
                returnedAt: caseItem.returnedAt,
                hasReturnDocument: hasReturnDocument(caseItem),
                editGuidance: null
            });
            setReturnDetailsDialogOpen(true);
        }
    };

    // NEW: Close return details dialog
    const handleCloseReturnDetails = () => {
        setReturnDetailsDialogOpen(false);
        setSelectedReturnReport(null);
        setReturnDetails(null);
    };

    const handleEditReturnedReport = async (caseItem) => {
        if (!caseItem.reportId) {
            showSnackbar('No report found for this case', 'warning');
            return;
        }

        setReportLoading(true);
        try {
            // Check if report can be edited (only returned reports)
            if (!isReturnedStatus(caseItem.status)) {
                showSnackbar('This report is not in a returned status', 'warning');
                return;
            }

            // Check edit permission first
            try {
                const permissionResponse = await ReportApi.checkEditPermission(caseItem.reportId);
                const { canEdit } = permissionResponse.data;

                if (!canEdit) {
                    showSnackbar('You are not authorized to edit this report', 'error');
                    return;
                }
            } catch (permError) {
                // Continue even if permission check fails
                console.warn('Could not verify edit permission:', permError);
            }

            // Navigate to edit page
            navigate(`/intelligence-officer/edit-report/${caseItem.reportId}`);
        } catch (err) {
            showSnackbar('Error accessing report', 'error');
            console.error('Error accessing report:', err);
        } finally {
            setReportLoading(false);
        }
    };

    const handleViewPdf = async (reportId) => {
        if (!reportId) {
            showSnackbar('No report available', 'warning');
            return;
        }

        setPdfLoading(true);
        try {
            showSnackbar('Opening PDF...', 'info');
            window.open(`/api/reports/${reportId}/pdf`, '_blank');
        } catch (error) {
            showSnackbar('Failed to open PDF', 'error');
            console.error('Error opening PDF:', error);
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadAttachment = async (reportId, filename) => {
        try {
            await ReportApi.downloadAttachment(reportId, filename);
            showSnackbar('Attachment downloaded successfully', 'success');
        } catch (err) {
            showSnackbar('Failed to download attachment', 'error');
        }
    };

    const handleGenerateExcelReport = () => {
        setExcelGenerating(true);

        try {
            let filteredReportData = [...cases];

            if (reportFilters.caseNumber) {
                filteredReportData = filteredReportData.filter(c =>
                    c.caseNum?.toLowerCase().includes(reportFilters.caseNumber.toLowerCase())
                );
            }

            if (reportFilters.taxType) {
                filteredReportData = filteredReportData.filter(c =>
                    c.taxType === reportFilters.taxType
                );
            }

            if (reportFilters.taxPeriod) {
                filteredReportData = filteredReportData.filter(c =>
                    c.taxPeriod === reportFilters.taxPeriod
                );
            }

            if (reportFilters.dateFrom) {
                filteredReportData = filteredReportData.filter(c => {
                    const caseDate = new Date(c.createdAt);
                    return caseDate >= reportFilters.dateFrom;
                });
            }

            if (reportFilters.dateTo) {
                filteredReportData = filteredReportData.filter(c => {
                    const caseDate = new Date(c.createdAt);
                    return caseDate <= reportFilters.dateTo;
                });
            }

            if (reportFilters.taxpayerName) {
                filteredReportData = filteredReportData.filter(c =>
                    c.taxPayer?.name?.toLowerCase().includes(reportFilters.taxpayerName.toLowerCase())
                );
            }

            if (reportFilters.status) {
                filteredReportData = filteredReportData.filter(c =>
                    c.status === reportFilters.status
                );
            }

            // Categorize cases for Excel report
            const createdCases = filteredReportData.filter(c =>
                c.status === 'CASE_CREATED' ||
                c.status === 'REPORT_SUBMITTED'
            );

            const pendingReviewCases = filteredReportData.filter(c =>
                c.status === 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE'
            );

            const returnedCases = filteredReportData.filter(c =>
                c.status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' ||
                c.status === 'REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION' ||
                c.status === 'REPORT_RETURNED_ASSISTANT_COMMISSIONER' ||
                c.status === 'REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE'
            );

            const approvedCases = filteredReportData.filter(c =>
                c.status === 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE' ||
                c.status === 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER' ||
                c.status === 'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION'
            );

            const closedCases = filteredReportData.filter(c =>
                c.status === 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE' ||
                c.status === 'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER' ||
                c.status === 'REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION'
            );

            const casesWithReports = filteredReportData.filter(c =>
                c.reportId && c.status !== 'CASE_CREATED'
            );

            const reportData = {
                categories: {
                    createdCases,
                    pendingReviewCases,
                    returnedCases,
                    approvedCases,
                    closedCases,
                    casesWithReports,
                    allCases: filteredReportData
                },
                summary: {
                    totalCases: filteredReportData.length,
                    createdCases: createdCases.length,
                    pendingReviewCases: pendingReviewCases.length,
                    returnedCases: returnedCases.length,
                    approvedCases: approvedCases.length,
                    closedCases: closedCases.length,
                    casesWithReports: casesWithReports.length
                },
                generatedAt: new Date(),
                filters: reportFilters
            };

            generateExcelFile(reportData);
            setGeneratedReportData(reportData);
            showSnackbar('Excel report generated successfully', 'success');

        } catch (error) {
            console.error('Error generating Excel report:', error);
            showSnackbar('Failed to generate Excel report', 'error');
        } finally {
            setExcelGenerating(false);
        }
    };

    const generateExcelFile = (reportData) => {
        const wb = XLSX.utils.book_new();

        // Create sheets for each category
        const categorySheets = [
            { name: 'All Cases', data: reportData.categories.allCases },
            { name: 'Created Cases', data: reportData.categories.createdCases },
            { name: 'Pending Review', data: reportData.categories.pendingReviewCases },
            { name: 'Returned Cases', data: reportData.categories.returnedCases },
            { name: 'Approved Cases', data: reportData.categories.approvedCases },
            { name: 'Closed Cases', data: reportData.categories.closedCases },
            { name: 'Cases with Reports', data: reportData.categories.casesWithReports }
        ];

        categorySheets.forEach(category => {
            if (category.data.length > 0) {
                const categoryData = [
                    [`${category.name.toUpperCase()} (${category.data.length} cases)`],
                    ['Generated on:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
                    [''],
                    ['Case Number', 'Report ID', 'Taxpayer Name', 'TIN', 'Tax Type', 'Tax Period',
                        'Status', 'Created Date', 'Last Updated', 'Days Open', 'Referring Officer', 'Return Reason']
                ];

                category.data.forEach((caseItem) => {
                    const createdDate = new Date(caseItem.createdAt);
                    const updatedDate = new Date(caseItem.updatedAt || caseItem.createdAt);
                    const daysOpen = Math.ceil(Math.abs(updatedDate - createdDate) / (1000 * 60 * 60 * 24));

                    categoryData.push([
                        caseItem.caseNum || '',
                        caseItem.reportId || 'No Report',
                        caseItem.taxPayer?.name || 'N/A',
                        caseItem.taxPayer?.tin || 'N/A',
                        caseItem.taxType || 'N/A',
                        caseItem.taxPeriod || 'N/A',
                        caseItem.status || 'Unknown',
                        format(createdDate, 'yyyy-MM-dd'),
                        format(updatedDate, 'yyyy-MM-dd'),
                        daysOpen,
                        caseItem.referringOfficerName || 'N/A',
                        caseItem.returnReason || 'N/A'
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(categoryData);
                ws['!cols'] = [
                    { wch: 15 },
                    { wch: 12 },
                    { wch: 25 },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 12 },
                    { wch: 25 },
                    { wch: 12 },
                    { wch: 12 },
                    { wch: 10 },
                    { wch: 20 },
                    { wch: 30 }
                ];

                // Style the title
                if (ws['A1']) {
                    ws['A1'].s = { font: { bold: true, sz: 14 } };
                }

                // Style the header row
                for (let col = 0; col < 12; col++) {
                    const cellRef = XLSX.utils.encode_cell({ r: 3, c: col });
                    if (ws[cellRef]) {
                        ws[cellRef].s = { font: { bold: true } };
                    }
                }

                XLSX.utils.book_append_sheet(wb, ws, category.name);
            }
        });

        // Summary sheet with category counts
        const summaryData = [
            ['INTELLIGENCE OFFICER REPORT - CASE CATEGORIES'],
            ['Generated on:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
            [''],
            ['CATEGORY SUMMARY'],
            ['Category', 'Number of Cases'],
            ['Total Cases', reportData.summary.totalCases],
            ['Created Cases', reportData.summary.createdCases],
            ['Pending Review Cases', reportData.summary.pendingReviewCases],
            ['Returned Cases', reportData.summary.returnedCases],
            ['Approved Cases', reportData.summary.approvedCases],
            ['Closed Cases', reportData.summary.closedCases],
            ['Cases with Reports', reportData.summary.casesWithReports]
        ];

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs['!cols'] = [
            { wch: 25 },
            { wch: 15 }
        ];

        // Style the title
        if (summaryWs['A1']) {
            summaryWs['A1'].s = { font: { bold: true, sz: 16 } };
        }
        if (summaryWs['A4']) {
            summaryWs['A4'].s = { font: { bold: true, sz: 14 } };
        }

        // Style the header row
        for (let col = 0; col < 2; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 4, c: col });
            if (summaryWs[cellRef]) {
                summaryWs[cellRef].s = { font: { bold: true } };
            }
        }

        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

        // Generate and download
        const fileName = `Intelligence_Case_Categories_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleResetFilters = () => {
        setReportFilters({
            caseNumber: '',
            taxType: '',
            taxPeriod: '',
            dateFrom: null,
            dateTo: null,
            taxpayerName: '',
            status: '',
            includeDetails: true,
            includeCharts: true
        });
        showSnackbar('Filters reset', 'info');
    };

    const handleSetDefaultDateRange = () => {
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);

        setReportFilters(prev => ({
            ...prev,
            dateFrom: thirtyDaysAgo,
            dateTo: today
        }));
        showSnackbar('Date range set to last 30 days', 'info');
    };

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const handleSortByDate = () => {
        const newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSortOrder(newSortOrder);
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CASE_CREATED': return '#1976d2';
            case 'REPORT_SUBMITTED': return '#ff9800';
            case 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE': return '#4caf50';
            case 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER': return '#f44336';
            case 'REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION': return '#f44336';
            case 'REPORT_RETURNED_ASSISTANT_COMMISSIONER': return '#f44336';
            case 'REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE': return '#f44336';
            case 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE': return '#d32f2f';
            case 'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER': return '#d32f2f';
            case 'REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION': return '#d32f2f';
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE': return '#2e7d32';
            case 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER': return '#2e7d32';
            case 'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION': return '#2e7d32';
            case 'INVESTIGATION_COMPLETED': return '#388e3c';
            default: return '#757575';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '-';
        }
    };

    const isReturnedStatus = (status) => {
        return status === 'REPORT_RETURNED_TO_INTELLIGENCE_OFFICER' ||
            status === 'REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION' ||
            status === 'REPORT_RETURNED_ASSISTANT_COMMISSIONER' ||
            status === 'REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE';
    };

    const getStatusIcon = (status) => {
        if (isReturnedStatus(status)) {
            return <WarningIcon sx={{ color: '#ff9800' }} />;
        }
        switch (status) {
            case 'CASE_CREATED':
            case 'REPORT_SUBMITTED':
                return <AddIcon sx={{ color: '#1976d2' }} />;
            case 'REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE':
                return <PendingIcon sx={{ color: '#4caf50' }} />;
            case 'REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE':
            case 'REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER':
            case 'REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION':
                return <CheckCircleIcon sx={{ color: '#2e7d32' }} />;
            case 'REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE':
            case 'REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER':
            case 'REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION':
                return <CancelIcon sx={{ color: '#d32f2f' }} />;
            default:
                return <DescriptionIcon sx={{ color: '#757575' }} />;
        }
    };

    const refreshData = () => {
        fetchData();
        showSnackbar('Data refreshed successfully', 'success');
    };

    if (loading.cases) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box p={3}>
                {/* Header with notifications */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Intelligence Officer Dashboard
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Manage your cases and reports
                        </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={2}>
                        {returnedCasesCount > 0 && (
                            <Badge badgeContent={returnedCasesCount} color="error">
                                <NotificationsActiveIcon color="warning" />
                            </Badge>
                        )}
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={refreshData}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Quick Actions for Returned Cases */}
                {returnedCasesCount > 0 && (
                    <Box mb={3}>
                        <Alert
                            severity="warning"
                            variant="outlined"
                            sx={{
                                backgroundColor: '#fff3e0',
                                borderColor: '#ff9800',
                                borderRadius: 2
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box flex={1}>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                        {returnedCasesCount} Report(s) Require Your Attention
                                    </Typography>
                                    <Typography variant="body2" paragraph>
                                        These reports have been returned for editing. Please review the return reasons and make necessary updates.
                                    </Typography>

                                    {/* List of returned cases */}
                                    <Grid container spacing={2}>
                                        {reportStats.returnedCases.slice(0, 3).map((returnedCase) => (
                                            <Grid item xs={12} sm={6} md={4} key={returnedCase.caseNum}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:hover': {
                                                            backgroundColor: '#fff8e1',
                                                            boxShadow: 2
                                                        }
                                                    }}
                                                    onClick={() => handleViewReturnDetails(returnedCase)}
                                                >
                                                    <CardContent sx={{ p: 2 }}>
                                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                            <WarningIcon color="warning" fontSize="small" />
                                                            <Typography variant="subtitle2" fontWeight="bold">
                                                                {returnedCase.caseNum}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" color="textSecondary" gutterBottom>
                                                            {returnedCase.taxPayer?.name || 'No taxpayer name'}
                                                        </Typography>
                                                        {returnedCase.returnReason && (
                                                            <Box>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    Return Reason:
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{
                                                                        display: 'block',
                                                                        color: '#d32f2f',
                                                                        fontStyle: 'italic',
                                                                        mt: 0.5
                                                                    }}
                                                                >
                                                                    {returnedCase.returnReason.length > 60
                                                                        ? returnedCase.returnReason.substring(0, 60) + '...'
                                                                        : returnedCase.returnReason}
                                                                </Typography>
                                                            </Box>
                                                        )}

                                                        {/* Action buttons */}
                                                        <Box display="flex" gap={1} mt={2}>
                                                            <Button
                                                                variant="text"
                                                                size="small"
                                                                endIcon={<ArrowForwardIcon />}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditReturnedReport(returnedCase);
                                                                }}
                                                            >
                                                                Edit Report
                                                            </Button>

                                                            {hasReturnDocument(returnedCase) && (
                                                                <Button
                                                                    variant="outlined"
                                                                    size="small"
                                                                    startIcon={
                                                                        returnDocumentLoading.has(returnedCase.reportId) ?
                                                                            <CircularProgress size={14} /> :
                                                                            <GetAppIcon />
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownloadReturnDocument(returnedCase.reportId);
                                                                    }}
                                                                    disabled={returnDocumentLoading.has(returnedCase.reportId)}
                                                                >
                                                                    Doc
                                                                </Button>
                                                            )}
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>

                                    {returnedCasesCount > 3 && (
                                        <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                                            ...and {returnedCasesCount - 3} more returned reports
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Alert>
                    </Box>
                )}

                {/* Case Category Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab
                            icon={<FolderIcon />}
                            iconPosition="start"
                            label={`All (${cases.length})`}
                            value="all"
                        />
                        <Tab
                            icon={<FolderIcon />}
                            iconPosition="start"
                            label={`Created (${reportStats.createdCases.length})`}
                            value="created"
                        />
                        <Tab
                            icon={<PendingIcon />}
                            iconPosition="start"
                            label={`Pending Review (${reportStats.pendingReviewCases.length})`}
                            value="pending"
                        />
                        <Tab
                            icon={
                                <Badge badgeContent={reportStats.returnedCases.length} color="error">
                                    <RefreshIcon />
                                </Badge>
                            }
                            iconPosition="start"
                            label={`Returned`}
                            value="returned"
                        />
                        <Tab
                            icon={<CheckCircleIcon />}
                            iconPosition="start"
                            label={`Approved (${reportStats.approvedCases.length})`}
                            value="approved"
                        />
                        <Tab
                            icon={<CancelIcon />}
                            iconPosition="start"
                            label={`Closed (${reportStats.closedCases.length})`}
                            value="closed"
                        />
                        <Tab
                            icon={<DescriptionIcon />}
                            iconPosition="start"
                            label={`With Reports (${reportStats.casesWithReports.length})`}
                            value="withReports"
                        />
                    </Tabs>
                </Box>

                {/* Search and Filter Bar */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
                    <Box display="flex" alignItems="center" width="50%" gap={2}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={`Search ${activeTab === 'all' ? 'all cases' : activeTab + ' cases'}...`}
                            variant="outlined"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <IconButton edge="start">
                                        <SearchIcon />
                                    </IconButton>
                                ),
                                endAdornment: searchTerm && (
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                )
                            }}
                        />

                        <Tooltip title={`Sort by creation date (${sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}>
                            <Button
                                variant="outlined"
                                onClick={handleSortByDate}
                                startIcon={sortOrder === 'desc' ? <ArrowDownward /> : <ArrowUpward />}
                            >
                                Date {sortOrder === 'desc' ? '↓' : '↑'}
                            </Button>
                        </Tooltip>

                        <Tooltip title={showOnlyWithReports ? "Show all cases" : "Show only cases with reports"}>
                            <Button
                                variant={showOnlyWithReports ? "contained" : "outlined"}
                                onClick={() => setShowOnlyWithReports(!showOnlyWithReports)}
                                startIcon={<FilterListIcon />}
                                color={showOnlyWithReports ? "primary" : "inherit"}
                            >
                                {showOnlyWithReports ? "All" : "With Reports"}
                            </Button>
                        </Tooltip>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/intelligence-officer/newCase')}
                        >
                            New Case
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<ExcelIcon />}
                            onClick={() => setReportDialog(true)}
                        >
                            Generate Report
                        </Button>
                    </Stack>
                </Box>

                {/* Current Category Info */}
                <Box mb={2}>
                    <Alert severity="info" variant="outlined">
                        <Typography variant="body2">
                            Showing <strong>{filteredCases.length}</strong> cases in <strong>
                                {activeTab === 'all' ? 'All Cases' :
                                    activeTab === 'created' ? 'Created Cases' :
                                        activeTab === 'pending' ? 'Pending Review' :
                                            activeTab === 'returned' ? 'Returned Cases' :
                                                activeTab === 'approved' ? 'Approved Cases' :
                                                    activeTab === 'closed' ? 'Closed Cases' :
                                                        'Cases with Reports'}</strong> category
                        </Typography>
                    </Alert>
                </Box>

                {/* Cases Table */}
                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: 'grey.100' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Case ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Report ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Taxpayer</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>TIN</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Tax Type</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Tax Period</TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        '&:hover': { backgroundColor: 'grey.200' }
                                    }}
                                    onClick={handleSortByDate}
                                >
                                    <Box display="flex" alignItems="center" gap={1}>
                                        Created Date
                                        {sortOrder === 'desc' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCases.length > 0 ? (
                                filteredCases
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((caseItem) => {
                                        const isReturned = isReturnedStatus(caseItem.status);
                                        const hasReturnDoc = hasReturnDocument(caseItem);

                                        return (
                                            <TableRow
                                                key={caseItem.caseNum}
                                                hover
                                                sx={{
                                                    backgroundColor: isReturned ? '#fff3e0' : (caseItem.reportId ? '#f0f9ff' : 'inherit'),
                                                    '&:hover': {
                                                        backgroundColor: isReturned ? '#ffe0b2' : (caseItem.reportId ? '#e3f2fd' : 'rgba(0, 0, 0, 0.04)')
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {caseItem.caseNum}
                                                        {isReturned && (
                                                            <Tooltip title="Report has been returned for edits">
                                                                <WarningIcon color="warning" fontSize="small" />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {caseItem.reportId ? (
                                                        <Chip
                                                            label={caseItem.reportId}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>{caseItem.taxPayer?.name || '-'}</TableCell>
                                                <TableCell>{caseItem.taxPayer?.tin || '-'}</TableCell>
                                                <TableCell>{caseItem.taxType || '-'}</TableCell>
                                                <TableCell>{caseItem.taxPeriod || '-'}</TableCell>
                                                <TableCell>
                                                    {formatDate(caseItem.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {getStatusIcon(caseItem.status)}
                                                        <Chip
                                                            label={caseItem.status}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: getStatusColor(caseItem.status),
                                                                color: 'white',
                                                                fontWeight: 'medium'
                                                            }}
                                                        />
                                                        {isReturned && (
                                                            <Tooltip title="View return details">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleViewReturnDetails(caseItem)}
                                                                    color="warning"
                                                                >
                                                                    <InfoIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" flexDirection="column" gap={1}>
                                                        {caseItem.reportId ? (
                                                            <>
                                                                <Box display="flex" gap={1}>
                                                                    {/* Edit button for returned reports */}
                                                                    {isReturned && (
                                                                        <Button
                                                                            variant="contained"
                                                                            color="warning"
                                                                            startIcon={<EditIcon />}
                                                                            onClick={() => handleEditReturnedReport(caseItem)}
                                                                            disabled={reportLoading}
                                                                            size="small"
                                                                            fullWidth
                                                                        >
                                                                            Edit Report
                                                                        </Button>
                                                                    )}

                                                                    {/* View Report button */}
                                                                    <Button
                                                                        variant="outlined"
                                                                        color="info"
                                                                        startIcon={<VisibilityIcon />}
                                                                        onClick={() => navigate(`/view-report/${caseItem.reportId}`)}
                                                                        size="small"
                                                                        fullWidth
                                                                    >
                                                                        View
                                                                    </Button>
                                                                </Box>

                                                                {/* Additional actions */}
                                                                <Box display="flex" gap={1}>
                                                                    {hasReturnDoc && (
                                                                        <Button
                                                                            variant="text"
                                                                            size="small"
                                                                            startIcon={
                                                                                returnDocumentLoading.has(caseItem.reportId) ?
                                                                                    <CircularProgress size={14} /> :
                                                                                    <GetAppIcon />
                                                                            }
                                                                            onClick={() => handleDownloadReturnDocument(caseItem.reportId)}
                                                                            disabled={returnDocumentLoading.has(caseItem.reportId)}
                                                                            sx={{ flex: 1 }}
                                                                        >
                                                                            Return Doc
                                                                        </Button>
                                                                    )}

                                                                    {caseItem.attachmentPaths && caseItem.attachmentPaths.length > 0 && (
                                                                        <Button
                                                                            variant="text"
                                                                            size="small"
                                                                            startIcon={<DownloadIcon />}
                                                                            onClick={() => {
                                                                                if (caseItem.attachmentPaths[0]) {
                                                                                    handleDownloadAttachment(caseItem.reportId, caseItem.attachmentPaths[0]);
                                                                                }
                                                                            }}
                                                                            sx={{ flex: 1 }}
                                                                        >
                                                                            Download PDF
                                                                        </Button>
                                                                    )}
                                                                </Box>
                                                            </>
                                                        ) : (
                                                            <Button
                                                                variant="contained"
                                                                color="primary"
                                                                startIcon={<AddIcon />}
                                                                onClick={() => navigate(`/intelligence-officer/claim-form/${encodeURIComponent(caseItem.caseNum)}`)}
                                                                size="small"
                                                                fullWidth
                                                            >
                                                                Create Report
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">
                                        <Box py={4}>
                                            <DescriptionIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                                            <Typography variant="body1" color="textSecondary">
                                                No cases found in this category
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <TablePagination
                        component="div"
                        count={filteredCases.length}
                        page={page}
                        onPageChange={(event, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(event) => {
                            setRowsPerPage(parseInt(event.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                </TableContainer>

                {/* Return Details Dialog */}
                <Dialog
                    open={returnDetailsDialogOpen}
                    onClose={handleCloseReturnDetails}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={1}>
                                <WarningIcon color="warning" />
                                <Typography variant="h6">
                                    Return Report Details
                                </Typography>
                            </Box>
                            <IconButton onClick={handleCloseReturnDetails} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>

                    <DialogContent>
                        {selectedReturnReport && returnDetails && (
                            <Box>
                                {/* Case Information */}
                                <Card variant="outlined" sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            Case Information
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Case Number:
                                                </Typography>
                                                <Typography variant="body1">
                                                    {selectedReturnReport.caseNum}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Report ID:
                                                </Typography>
                                                <Typography variant="body1">
                                                    {selectedReturnReport.reportId}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Taxpayer:
                                                </Typography>
                                                <Typography variant="body1">
                                                    {selectedReturnReport.taxPayer?.name || 'N/A'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Return Details */}
                                <Card variant="outlined" sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            Return Information
                                        </Typography>

                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="body2" color="textSecondary">
                                                Return Reason:
                                            </Typography>
                                            <Alert
                                                severity="warning"
                                                variant="outlined"
                                                sx={{ mt: 1 }}
                                            >
                                                <Typography variant="body1">
                                                    {returnDetails.returnReason || 'No return reason provided'}
                                                </Typography>
                                            </Alert>
                                        </Box>

                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Returned By:
                                                </Typography>
                                                <Typography variant="body1">
                                                    {returnDetails.returnedBy || 'Unknown'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Returned At:
                                                </Typography>
                                                <Typography variant="body1">
                                                    {returnDetails.returnedAt ? formatDate(returnDetails.returnedAt) : 'Unknown'}
                                                </Typography>
                                            </Grid>
                                        </Grid>

                                        {returnDetails.editGuidance && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Edit Guidance:
                                                </Typography>
                                                <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                                                    <Typography variant="body2">
                                                        {returnDetails.editGuidance}
                                                    </Typography>
                                                </Alert>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Actions */}
                                <Box display="flex" gap={2} justifyContent="flex-end">
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        startIcon={<EditIcon />}
                                        onClick={() => {
                                            handleCloseReturnDetails();
                                            handleEditReturnedReport(selectedReturnReport);
                                        }}
                                        disabled={reportLoading}
                                    >
                                        Edit Report
                                    </Button>

                                    {returnDetails.hasReturnDocument && (
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            startIcon={
                                                returnDocumentLoading.has(selectedReturnReport.reportId) ?
                                                    <CircularProgress size={20} /> :
                                                    <GetAppIcon />
                                            }
                                            onClick={() => handleDownloadReturnDocument(selectedReturnReport.reportId)}
                                            disabled={returnDocumentLoading.has(selectedReturnReport.reportId)}
                                        >
                                            Download Return Document
                                        </Button>
                                    )}

                                    <Button
                                        variant="outlined"
                                        color="info"
                                        onClick={() => {
                                            handleCloseReturnDetails();
                                            navigate(`/view-report/${selectedReturnReport.reportId}`);
                                        }}
                                    >
                                        View Full Report
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={handleCloseReturnDetails}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Excel Report Generation Dialog */}
                <Dialog
                    open={reportDialog}
                    onClose={() => setReportDialog(false)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center" gap={1}>
                            <ExcelIcon color="success" />
                            <Typography variant="h6">
                                Generate Excel Report by Categories
                            </Typography>
                        </Box>
                    </DialogTitle>

                    {excelGenerating && <LinearProgress />}

                    <DialogContent>
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            {/* Report Options */}
                            <Grid item xs={12}>
                                <Card variant="outlined">
                                    <CardHeader
                                        title="Report Filters"
                                        titleTypographyProps={{ variant: 'h6' }}
                                    />
                                    <CardContent>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Tax Type</InputLabel>
                                                    <Select
                                                        value={reportFilters.taxType}
                                                        label="Tax Type"
                                                        onChange={(e) => setReportFilters(prev => ({ ...prev, taxType: e.target.value }))}
                                                    >
                                                        <MenuItem value="">All Tax Types</MenuItem>
                                                        <MenuItem value="Income Tax">Income Tax</MenuItem>
                                                        <MenuItem value="VAT">VAT</MenuItem>
                                                        <MenuItem value="Withholding Tax">Withholding Tax</MenuItem>
                                                        <MenuItem value="Excise Duty">Excise Duty</MenuItem>
                                                        <MenuItem value="Customs Duty">Customs Duty</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Status</InputLabel>
                                                    <Select
                                                        value={reportFilters.status}
                                                        label="Status"
                                                        onChange={(e) => setReportFilters(prev => ({ ...prev, status: e.target.value }))}
                                                    >
                                                        <MenuItem value="">All Status</MenuItem>
                                                        <MenuItem value="CASE_CREATED">Case Created</MenuItem>
                                                        <MenuItem value="REPORT_SUBMITTED">Report Submitted</MenuItem>
                                                        <MenuItem value="REPORT_SUBMITTED_TO_DIRECTOR_OF_INTELLIGENCE">With Director</MenuItem>
                                                        <MenuItem value="REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE">Approved by Director</MenuItem>
                                                        <MenuItem value="REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER">Approved by Commissioner</MenuItem>
                                                        <MenuItem value="REPORT_RETURNED_TO_INTELLIGENCE_OFFICER">Returned</MenuItem>
                                                        <MenuItem value="REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE">Rejected</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    label="Case Number"
                                                    value={reportFilters.caseNumber}
                                                    onChange={(e) => setReportFilters(prev => ({ ...prev, caseNumber: e.target.value }))}
                                                    size="small"
                                                    placeholder="Enter specific case number"
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    label="Taxpayer's Name"
                                                    value={reportFilters.taxpayerName}
                                                    onChange={(e) => setReportFilters(prev => ({ ...prev, taxpayerName: e.target.value }))}
                                                    size="small"
                                                    placeholder="Search by taxpayer name"
                                                />
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <DatePicker
                                                    label="Date From"
                                                    value={reportFilters.dateFrom}
                                                    onChange={(date) => setReportFilters(prev => ({ ...prev, dateFrom: date }))}
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            size: 'small'
                                                        }
                                                    }}
                                                />
                                            </Grid>

                                            <Grid item xs={12} sm={6}>
                                                <DatePicker
                                                    label="Date To"
                                                    value={reportFilters.dateTo}
                                                    onChange={(date) => setReportFilters(prev => ({ ...prev, dateTo: date }))}
                                                    slotProps={{
                                                        textField: {
                                                            fullWidth: true,
                                                            size: 'small'
                                                        }
                                                    }}
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    label="Tax Period"
                                                    value={reportFilters.taxPeriod}
                                                    onChange={(e) => setReportFilters(prev => ({ ...prev, taxPeriod: e.target.value }))}
                                                    size="small"
                                                    placeholder="e.g., Q1 2024, January 2024, FY2024"
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Report Preview */}
                            <Grid item xs={12}>
                                <Card variant="outlined">
                                    <CardHeader
                                        title="Report Preview"
                                        subheader={`Will include ${cases.length} total cases`}
                                        titleTypographyProps={{ variant: 'h6' }}
                                    />
                                    <CardContent>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Created Cases
                                                </Typography>
                                                <Typography variant="h6" color="info.main">
                                                    {reportStats.createdCases.length}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Pending Review
                                                </Typography>
                                                <Typography variant="h6" color="warning.main">
                                                    {reportStats.pendingReviewCases.length}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Returned Cases
                                                </Typography>
                                                <Typography variant="h6" color="error.main">
                                                    {reportStats.returnedCases.length}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Approved Cases
                                                </Typography>
                                                <Typography variant="h6" color="success.main">
                                                    {reportStats.approvedCases.length}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="body2" color="textSecondary">
                                                    Closed Cases
                                                </Typography>
                                                <Typography variant="h6" color="error.main">
                                                    {reportStats.closedCases.length}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <Typography variant="body2" color="textSecondary">
                                                    With Reports
                                                </Typography>
                                                <Typography variant="h6" color="primary.main">
                                                    {reportStats.casesWithReports.length}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Action Buttons */}
                            <Grid item xs={12}>
                                <Box display="flex" justifyContent="space-between" gap={2}>
                                    <Box display="flex" gap={1}>
                                        <Button
                                            startIcon={<ClearIcon />}
                                            onClick={handleResetFilters}
                                            variant="outlined"
                                            size="small"
                                        >
                                            Clear Filters
                                        </Button>
                                        <Button
                                            startIcon={<DateRangeIcon />}
                                            onClick={handleSetDefaultDateRange}
                                            variant="outlined"
                                            size="small"
                                        >
                                            Last 30 Days
                                        </Button>
                                    </Box>

                                    <Box display="flex" gap={1}>
                                        <Button
                                            startIcon={excelGenerating ? <CircularProgress size={20} /> : <ExcelIcon />}
                                            onClick={handleGenerateExcelReport}
                                            variant="contained"
                                            color="success"
                                            disabled={excelGenerating}
                                        >
                                            {excelGenerating ? 'Generating...' : 'Generate Excel Report'}
                                        </Button>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Excel Features Info */}
                            <Grid item xs={12}>
                                <Alert severity="info" variant="outlined">
                                    <Typography variant="body2" fontWeight="bold">
                                        Excel Report Features:
                                    </Typography>
                                    <Typography variant="caption" component="div">
                                        • Separate sheets for each case category
                                        <br />
                                        • Summary sheet with category counts
                                        <br />
                                        • All case details with formatting
                                        <br />
                                        • Professional column widths
                                        <br />
                                        • Automatic filename with timestamp
                                    </Typography>
                                </Alert>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setReportDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    );
};

export default IntelligenceOfficer;