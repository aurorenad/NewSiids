import React, { createContext, useState, useContext } from 'react';
import { ReportApi } from '../api/Axios/caseApi';
import { UIContext } from './UIContext';
import { CasesContext } from './CasesContext';

export const ReportsContext = createContext();

export const ReportsProvider = ({ children }) => {
    const [selectedReport, setSelectedReport] = useState(null);
    const [currentReport, setCurrentReport] = useState(null);
    const [reportFormData, setReportFormData] = useState({
        returnReason: '',
        description: '',
        relatedCase: { caseNum: '' }
    });
    const [pdfUrl, setPdfUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    
    const { showSnackbar, setLoading } = useContext(UIContext);
    const { updateCase } = useContext(CasesContext);

    // Get report by ID
    const getReport = async (reportId) => {
        try {
            setLoading(true);
            const response = await ReportApi.getReport(reportId);
            setCurrentReport(response.data);
            return response.data;
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to load report', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Send report to Director of Intelligence
    const sendToDirectorIntelligence = async (reportId) => {
        try {
            setLoading(true);
            await ReportApi.sendToDirectorIntelligence(reportId);
            showSnackbar('Report successfully sent to Director of Intelligence', 'success');
            return true;
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to send report', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Update returned report
    const updateReturnedReport = async (reportId, formData) => {
        try {
            setLoading(true);
            const response = await ReportApi.updateReturnedReport(reportId, formData);
            showSnackbar('Report updated and resubmitted successfully', 'success');
            return response.data;
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to update report', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // View PDF
    const viewPdf = async (reportId) => {
        try {
            setLoading(true);
            const response = await ReportApi.downloadAttachment(reportId);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            return url;
        } catch (error) {
            showSnackbar(error.response?.data?.message || 'Failed to load PDF', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // PDF navigation
    const handlePreviousPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
    
    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    return (
        <ReportsContext.Provider value={{
            selectedReport,
            setSelectedReport,
            currentReport,
            setCurrentReport,
            reportFormData,
            setReportFormData,
            pdfUrl,
            setPdfUrl,
            numPages,
            pageNumber,
            handlePreviousPage,
            handleNextPage,
            onDocumentLoadSuccess,
            getReport,
            sendToDirectorIntelligence,
            updateReturnedReport,
            viewPdf
        }}>
            {children}
        </ReportsContext.Provider>
    );
};

export const useReports = () => useContext(ReportsContext);